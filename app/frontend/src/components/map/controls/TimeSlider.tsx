"use client";

/**
 * Forecast horizon selector — Now, then 3-hourly to +72h.
 *
 * This was four segments (Now / +24 / +48 / +72) because the forecast agent only
 * produced three horizons. It now produces 24, so a continuous control is no
 * longer implying a resolution we lack — it reflects one we have.
 *
 * A RANGE, not 25 segments: twenty-five buttons do not fit a map overlay, and
 * scrubbing is the point. The diurnal swing is the thing worth seeing move, and
 * at 24-hour steps it is invisible because every sample lands on the same hour
 * of day.
 *
 * Snapped to 3h steps rather than free-scrolling, because 3h is the real grid.
 */
const STEP_H = 3;
const MAX_H = 72;

interface Props {
  value: number;                 // 0, or 3..72 in steps of 3
  onChange: (v: number) => void;
}

/** Wall-clock label for a lead time, so "+15h" reads as a time of day. */
function clockAt(h: number): string {
  const d = new Date(Date.now() + h * 3_600_000);
  const hh = d.getHours();
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}${hh < 12 ? "am" : "pm"}`;
}

export default function TimeSlider({ value, onChange }: Props) {
  return (
    <div
      className="glass"
      style={{
        borderRadius: "var(--radius-lg)",
        padding: "6px 12px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "var(--shadow-md)",
      }}
      role="group"
      aria-label="Forecast horizon"
    >
      <span className="section-label" style={{ whiteSpace: "nowrap" }}>Forecast</span>

      <input
        type="range"
        min={0}
        max={MAX_H}
        step={STEP_H}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Forecast horizon in hours ahead"
        aria-valuetext={value === 0 ? "Now, live fusion field" : `Plus ${value} hours`}
        style={{ flex: 1, minWidth: 120, accentColor: "var(--accent)", cursor: "pointer" }}
      />

      {/* Fixed-width readout: without it the control reflows on every step as the
          label changes width, and the slider jitters under the thumb. */}
      <div style={{ minWidth: 84, textAlign: "right", lineHeight: 1.15 }}>
        <div
          className="mono"
          style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--text-primary)" }}
        >
          {value === 0 ? "Now" : `+${value}h`}
        </div>
        <div style={{ fontSize: "0.62rem", color: "var(--text-tertiary)" }}>
          {value === 0 ? "live" : clockAt(value)}
        </div>
      </div>
    </div>
  );
}
