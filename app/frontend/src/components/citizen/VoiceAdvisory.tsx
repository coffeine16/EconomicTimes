"use client";
/**
 * VoiceAdvisory — plays the ward's spoken health advisory.
 *
 * The brief asks for advisories delivered by "IVR in regional languages"; the
 * populations most exposed (outdoor workers) skew low-literacy, so the spoken
 * version is the product, not a garnish. Clips are generated in batch by the
 * voice agent (Google Cloud TTS) and shipped per city, so this works on a static
 * deploy with no backend.
 *
 * HONESTY: every clip carries the verification status of the TEXT it speaks.
 * Audio *feels* more authoritative than text, so a machine-written line must not
 * launder itself into sounding official by becoming a voice note. We say which
 * is which, per language.
 */
import { useEffect, useState } from "react";

const LANG_NAME: Record<string, string> = {
  en: "English", hi: "हिन्दी", ta: "தமிழ்", kn: "ಕನ್ನಡ",
};

const VERIFICATION_NOTE: Record<string, string> = {
  cpcb_official: "Wording is CPCB's own published advisory text.",
  native_speaker: "Reviewed by a native speaker.",
  cross_checked: "Machine-written, cross-checked by a second model — NOT reviewed by a native speaker.",
  unverified: "Machine-written, not reviewed.",
};

interface Entry {
  ward_id: string;
  lang: string;
  path: string;
  voice?: string;
  text_verification?: string;
}

export default function VoiceAdvisory({ city, wardId }: { city: string; wardId: string }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [lang, setLang] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/audio/${city}/manifest.json`)
      .then((r) => (r.ok ? r.json() : []))
      .then((m: Entry[]) => {
        if (!alive) return;
        const mine = m.filter((e) => e.ward_id === wardId);
        setEntries(mine);
        setLang(mine.find((e) => e.lang !== "en")?.lang ?? mine[0]?.lang ?? null);
      })
      .catch(() => alive && setEntries([]));
    return () => { alive = false; };
  }, [city, wardId]);

  // Nothing generated for this ward — say nothing rather than show a dead player.
  if (!entries || entries.length === 0 || !lang) return null;

  const current = entries.find((e) => e.lang === lang);
  const note = VERIFICATION_NOTE[current?.text_verification ?? "unverified"];
  const isNative = current?.text_verification === "native_speaker" || current?.text_verification === "cpcb_official";

  return (
    <div className="card" style={{ marginBottom: "var(--space-lg)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: "var(--space-sm)" }}>
        <h5 style={{ margin: 0 }}>🔊 Listen to this advisory</h5>
        {entries.length > 1 && (
          <div style={{ display: "flex", gap: 4 }}>
            {entries.map((e) => (
              <button
                key={e.lang}
                onClick={() => setLang(e.lang)}
                style={{
                  padding: "4px 10px", borderRadius: "var(--radius-full)",
                  border: `1px solid ${e.lang === lang ? "var(--accent-blue)" : "var(--border-default)"}`,
                  background: e.lang === lang ? "var(--accent-blue)" : "transparent",
                  color: e.lang === lang ? "#fff" : "var(--text-secondary)",
                  fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                {LANG_NAME[e.lang] ?? e.lang}
              </button>
            ))}
          </div>
        )}
      </div>

      <audio
        key={current?.path}
        controls
        preload="none"
        src={`/audio/${city}/${current?.path?.split("/").pop()}`}
        style={{ width: "100%", height: 38 }}
      >
        Your browser cannot play audio.
      </audio>

      <div style={{
        marginTop: 8, fontSize: "0.72rem", lineHeight: 1.5,
        color: isNative ? "var(--text-tertiary)" : "var(--accent-amber)",
      }}>
        {!isNative && "⚠ "}{note}
      </div>
    </div>
  );
}
