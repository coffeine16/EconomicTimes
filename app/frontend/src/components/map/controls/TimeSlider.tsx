"use client";

/**
 * Forecast horizon selector.
 *
 * DISCRETE on purpose: the forecast agent produces 24h / 48h / 72h horizons, not
 * an hourly series. A continuous 0-72 slider would imply a resolution we do not
 * have. Four honest steps: Now (the fusion field) and the three real horizons.
 */
const STEPS = [
  { h: 0,  label: "Now",  sub: "live" },
  { h: 24, label: "+24h", sub: "" },
  { h: 48, label: "+48h", sub: "" },
  { h: 72, label: "+72h", sub: "" },
] as const;

interface Props {
  value: number;                 // 0 | 24 | 48 | 72
  onChange: (v: number) => void;
}

export default function TimeSlider({ value, onChange }: Props) {
  return (
    <div
      className="glass"
      style={{
        borderRadius: "var(--radius-md)",
        padding: "8px 10px",
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span style={{
        fontSize: "0.62rem", color: "var(--text-tertiary)", fontWeight: 700,
        letterSpacing: "0.06em", textTransform: "uppercase", paddingLeft: 4,
        whiteSpace: "nowrap",
      }}>
        Forecast
      </span>

      <div style={{ display: "flex", gap: 4, flex: 1 }}>
        {STEPS.map((s) => {
          const active = value === s.h;
          return (
            <button
              key={s.h}
              onClick={() => onChange(s.h)}
              title={s.h === 0 ? "Live fusion field" : `Predicted PM2.5 in ${s.h} hours`}
              style={{
                flex: 1, padding: "6px 4px", borderRadius: "var(--radius-sm)",
                border: `1px solid ${active ? "var(--accent-blue)" : "var(--border-default)"}`,
                background: active ? "var(--accent-blue)" : "transparent",
                color: active ? "#fff" : "var(--text-secondary)",
                fontWeight: active ? 700 : 500, fontSize: "0.74rem",
                cursor: "pointer", whiteSpace: "nowrap",
                transition: "all var(--transition-fast)",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
