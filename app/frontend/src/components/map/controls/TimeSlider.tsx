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
        borderRadius: "var(--radius-lg)",
        padding: "6px 10px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        boxShadow: "var(--shadow-md)",
      }}
      role="group"
      aria-label="Forecast horizon"
    >
      <span className="section-label" style={{ whiteSpace: "nowrap" }}>Forecast</span>

      {/* A segmented control: one recessed track, the selection is the only
          raised surface. Four separately-outlined buttons read as four
          competing actions; a segment reads as one setting with four values. */}
      <div
        style={{
          display: "flex", gap: 2, flex: 1, padding: 2,
          background: "var(--bg-tertiary)", borderRadius: "var(--radius-md)",
        }}
      >
        {STEPS.map((s) => {
          const active = value === s.h;
          return (
            <button
              key={s.h}
              onClick={() => onChange(s.h)}
              aria-pressed={active}
              title={s.h === 0 ? "Live fusion field" : `Predicted PM2.5 in ${s.h} hours`}
              style={{
                flex: 1, padding: "5px 4px", borderRadius: "var(--radius-sm)",
                border: "none",
                background: active ? "var(--bg-elevated)" : "transparent",
                boxShadow: active ? "var(--shadow-sm)" : "none",
                color: active ? "var(--text-primary)" : "var(--text-tertiary)",
                fontWeight: active ? 600 : 480, fontSize: "0.73rem",
                fontFamily: "inherit",
                cursor: "pointer", whiteSpace: "nowrap",
                transition: "background var(--transition-fast), color var(--transition-fast)",
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
