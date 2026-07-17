# Spec — Voice Advisories (TTS) · owner: Shyam

**Why you:** you own the GCP project, you already enabled the API, and — the real
reason — **you are the only person here who can hear whether the Tamil is right.**
That is the actual risk in this task, and it is not a formality. See §5.

**Status:** TTS is live. Verified with a real call — it returned a 115 KB Hindi MP3.
Nothing to enable.

```
hi-IN  46 voices     ta-IN  38 voices     kn-IN  38 voices     en-IN  available
```

(Amazon Polly has Hindi but **no Tamil and no Kannada** — one of several reasons this
project is on GCP.)

---

## 1. What this is, in one line

Turn each ward's text advisory into an **MP3 in that ward's language**, so it can be
played on a phone, a public display, or an IVR line.

## 2. Why it exists (say this in the demo)

The brief asks for advisories pushed via *"mobile apps, public displays, and **IVR in
regional languages**"*. Its stated reason is that the most-exposed people — **outdoor
workers** — skew low-literacy.

So a text-only advisory is theatre: it looks like coverage while reaching nobody who
needs it most. **A voice note is the difference between a feature and a delivery.**

---

## 3. Zero setup

You need **no keys** beyond the gcloud login you already have.

```bash
git clone https://github.com/coffeine16/EconomicTimes.git && cd EconomicTimes
pip install -r requirements.txt
export PYTHONPATH=.                                  # PowerShell: $env:PYTHONPATH="."
python scripts/run_pipeline.py --synthetic --full    # ~2 min, writes advisories.json
```

That produces `data/outputs/advisories.json` — 60 wards, each with `texts` per
language. That file is your input. Look at it before writing anything.

---

## 4. Build `intelligence/agents/voice.py`

### Input
`data/outputs/advisories.json` — each entry already has:

```jsonc
{
  "ward_id": "W003", "ward_name": "Ward 003",
  "aqi": 402, "aqi_category": "Severe", "risk_tier": "critical",
  "languages": ["en", "kn"],
  "texts": { "en": "Air quality in ...", "kn": "Ward 003 ನಲ್ಲಿ ಗಾಳಿ ..." },
  "verification": { "en": "cpcb_official", "kn": "cross_checked" }
}
```

### Output
```
data/outputs/audio/{ward_id}_{lang}.mp3
data/outputs/audio/manifest.json
```

```jsonc
// manifest.json
[{ "ward_id": "W003", "lang": "kn", "path": "audio/W003_kn.mp3",
   "voice": "kn-IN-Wavenet-A", "chars": 148, "bytes": 115456,
   "text_hash": "a1b2c3...",              // so we can skip unchanged text
   "text_verification": "cross_checked" }] // carried through from the advisory
```

Also add `"audio": {"kn": "audio/W003_kn.mp3"}` to each advisory in
`advisories.json` so the frontend can find it without a second lookup.

### The API call

```python
import base64, json, urllib.request, subprocess

def _token():
    return subprocess.run(["gcloud", "auth", "print-access-token"],
                          capture_output=True, text=True).stdout.strip()

def synthesize(text: str, lang_code: str, voice: str) -> bytes:
    body = {
        "input": {"text": text},
        "voice": {"languageCode": lang_code, "name": voice},
        "audioConfig": {"audioEncoding": "MP3", "speakingRate": 0.9},
    }
    req = urllib.request.Request(
        "https://texttospeech.googleapis.com/v1/text:synthesize",
        data=json.dumps(body).encode(),
        headers={"Authorization": f"Bearer {_token()}",
                 "x-goog-user-project": "aq-intelligence",
                 "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return base64.b64decode(json.loads(r.read())["audioContent"])
```

`speakingRate: 0.9` is a starting guess — **you should tune it by ear.** A health
warning read too fast is a health warning nobody follows.

`intelligence/agents/advisory.py::TTS_VOICE` already maps language → voice. **Change
it if a different voice sounds better** — you can hear them; I picked Wavenet-A blind.

---

## 5. ⚠️ The part only you can do

**Listen to the output. Especially the Tamil.**

Two specific things I cannot check and you can:

1. **Code-mixing.** Our text embeds English ward names inside Tamil/Kannada:
   `"Bhalswa ல் காற்று மோசமா இருக்கு"`. Does the Tamil voice pronounce `Bhalswa`
   sanely, or does it mangle it? If it mangles it, tell us — we may need to
   transliterate ward names for the audio path only (keeping English in the text).

2. **Does it sound like a warning?** The Tamil you approved reads well. Read *aloud
   by a robot at 0.9x*, does a severe-air warning still land as urgent, or does it
   sound like a train announcement?

If either is bad, **say so and don't ship that language's audio.** Wrong-sounding
health advice is worse than none — it is the same trap as the unreviewed Kannada text,
just harder to notice because audio feels authoritative.

**Kannada note:** the Kannada text is `cross_checked`, **not** native-verified — no
Kannada speaker has read it. Your basic Kannada is the closest we have. If generating
its audio, carry `text_verification` into the manifest so nothing downstream can claim
more than we know.

---

## 6. Design rules (these are project-wide, not preferences)

1. **CACHE BY TEXT HASH.** Only synthesize when the text changed. `advisories.json` is
   regenerated every pipeline run, but the text usually does not move — re-synthesizing
   120 files every run wastes money and time for nothing. Hash the text; skip on match.

2. **BATCH, NEVER PER-REQUEST.** This runs in the pipeline and writes files. The API
   only *serves* what exists. Never synthesize inside a request handler — that is
   principle 3, and it is also how you make a demo hang on stage.

3. **NEVER FAIL THE PIPELINE.** If TTS errors or the quota trips, log it, skip that
   file, carry on. Text advisories must still ship. Voice is an enhancement, not a
   dependency (principle 2).

4. **Cost is trivial, but don't be silly.** ~150 chars/advisory × 60 wards × 2 langs =
   ~18k chars ≈ **$0.29** at WaveNet rates, inside the $300 credits. With caching, the
   second run costs ~$0. Without caching you would pay that on every run forever.

---

## 7. Wire it up

```python
# scripts/run_pipeline.py — after advisory_run()
from intelligence.agents.voice import run as voice_run
voice_run()
```

```python
# app/backend/main.py
from fastapi.staticfiles import StaticFiles
app.mount("/audio", StaticFiles(directory=DATA_OUT / "audio"), name="audio")

@app.get("/voice/{ward_id}")
def voice(ward_id: str, lang: str = "en"):
    """Path to a ward's advisory audio, with the text's verification status."""
    ...
```

---

## 8. Definition of done

- [ ] `python intelligence/agents/voice.py` writes MP3s + `manifest.json`
- [ ] Re-running with unchanged text synthesizes **nothing** (cache works)
- [ ] Killing your network mid-run does **not** fail the pipeline
- [ ] `manifest.json` carries `text_verification` per file
- [ ] Wired into `run_pipeline.py --full` and served by the API
- [ ] **You have listened to the Tamil and the Kannada and said out loud whether they
      are good enough to play to a real person.** That is the acceptance test.

---

## 9. If you want a second task after this

**Mobility feeds** (`docs/` — ask, we'll spec it). TomTom Traffic Flow has a free
tier; `currentSpeed` vs `freeFlowSpeed` per road segment is a real congestion signal,
and congestion is the one traffic tracer our satellite cannot give us. Caveat already
measured: the free tier is **live only** (a 60-day panel would need 2.45M requests vs
~2,500/day), so it is a live layer, not a backfill.
