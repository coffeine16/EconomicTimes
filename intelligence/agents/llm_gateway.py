"""LLM gateway — one doorway for every agent.

Provider chain: Gemini (GEMINI_API_KEY) -> Groq (GROQ_API_KEY) -> None.
Callers ALWAYS have a deterministic rule-based fallback, so a missing key or a
rate limit degrades explanation quality, never correctness. Strict-JSON only:
we ask for JSON, strip code fences, parse hard, and return None on any doubt.
"""
import json
import os
import urllib.request

GEMINI_URL = ("https://generativelanguage.googleapis.com/v1beta/models/"
              "gemini-2.5-flash:generateContent?key={key}")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

# ── Circuit breaker ───────────────────────────────────────────────────────────
# A provider that is down stays down for the length of a run: a bad key 404s
# every time, an exhausted quota 429s every time. Retrying it per call turns one
# broken credential into hundreds of sequential network round-trips.
#
# Measured: Delhi's advisory agent warms ~266 wards, and with a 404-ing Gemini
# key that step took 166 SECONDS — the whole reason a live /run/agent blew its
# request budget on Cloud Run and returned a bare 503. The output was already
# correct (every advisory fell back to its template); we were simply paying full
# network latency to be told "no" 266 times.
#
# So: after CIRCUIT_TRIP consecutive failures, skip that provider for the rest
# of the process and go straight to the next one — or to the caller's rule-based
# fallback, which is the deterministic path that was going to run anyway.
CIRCUIT_TRIP = 2
_fails: dict[str, int] = {}


def _open(provider: str) -> bool:
    """True when this provider has failed enough to be skipped."""
    return _fails.get(provider, 0) >= CIRCUIT_TRIP


def _trip(provider: str, err: Exception) -> None:
    n = _fails.get(provider, 0) + 1
    _fails[provider] = n
    print(f"[llm] {provider} failed: {type(err).__name__}: {err}")
    if n == CIRCUIT_TRIP:
        print(f"[llm] {provider} circuit OPEN after {n} failures — "
              f"skipping it for the rest of this run, using the next provider "
              f"or the rule-based fallback")


def reset_circuits() -> None:
    """Forget the failures. For a long-lived server that must retry next run."""
    _fails.clear()


def _post(url: str, payload: dict, headers: dict) -> dict:
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json", **headers})
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.loads(r.read())


def _parse_json(text: str) -> dict | None:
    t = text.strip()
    if t.startswith("```"):
        t = t.strip("`")
        t = t[t.find("{"):]
    try:
        start, end = t.index("{"), t.rindex("}") + 1
        return json.loads(t[start:end])
    except (ValueError, json.JSONDecodeError):
        return None


def complete_json(prompt: str) -> tuple[dict | None, str]:
    """Returns (parsed_json_or_None, provider_used)."""
    if (key := os.environ.get("GEMINI_API_KEY")) and not _open("gemini"):
        try:
            out = _post(GEMINI_URL.format(key=key), {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"},
            }, {})
            text = out["candidates"][0]["content"]["parts"][0]["text"]
            if parsed := _parse_json(text):
                return parsed, "gemini"
        except Exception as e:
            _trip("gemini", e)
    if (key := os.environ.get("GROQ_API_KEY")) and not _open("groq"):
        try:
            out = _post(GROQ_URL, {
                "model": GROQ_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
            }, {"Authorization": f"Bearer {key}"})
            if parsed := _parse_json(out["choices"][0]["message"]["content"]):
                return parsed, "groq"
        except Exception as e:
            _trip("groq", e)
    return None, "none"
