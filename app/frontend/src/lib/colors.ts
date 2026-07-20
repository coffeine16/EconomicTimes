/**
 * India NAQI (National Air Quality Index) breakpoints and color palette.
 * Used for all AQI-based coloring across the map layers and UI components.
 */

// ─── AQI Breakpoints ──────────────────────────────────────────────────────────

export const AQI_BREAKPOINTS = [0, 50, 100, 200, 300, 400, 500] as const;

// India NAQI PM2.5 breakpoints (CPCB). These MUST match the backend's authoritative
// table (intelligence/agents/memo.py::NAQI_PM25) or the citizen map would show a
// different AQI than the advisory computed for the same ward. Earlier this file
// used US EPA breakpoints (12/35.4/55.4/…) with Indian labels — a real mismatch.
export const AQI_CATEGORIES = [
  { label: "Good", range: "0–50", color: "#00b050", textColor: "#fff", pm25Max: 30 },
  { label: "Satisfactory", range: "51–100", color: "#92d050", textColor: "#222", pm25Max: 60 },
  { label: "Moderate", range: "101–200", color: "#ffff00", textColor: "#222", pm25Max: 90 },
  { label: "Poor", range: "201–300", color: "#ff9900", textColor: "#fff", pm25Max: 120 },
  { label: "Very Poor", range: "301–400", color: "#ff0000", textColor: "#fff", pm25Max: 250 },
  { label: "Severe", range: "401–500", color: "#99004c", textColor: "#fff", pm25Max: Infinity },
] as const;

/** Convert PM2.5 µg/m³ to India NAQI AQI. Mirrors backend memo.py::pm25_to_aqi. */
export function pm25ToAqi(pm25: number): number {
  // (conc_lo, conc_hi, aqi_lo, aqi_hi) — CPCB NAQI PM2.5 sub-index table
  const bands: [number, number, number, number][] = [
    [0, 30, 0, 50],
    [30, 60, 51, 100],
    [60, 90, 101, 200],
    [90, 120, 201, 300],
    [120, 250, 301, 400],
    [250, 1000, 401, 500],
  ];
  for (const [cLo, cHi, iLo, iHi] of bands) {
    if (pm25 <= cHi) {
      return Math.round(iLo + ((iHi - iLo) * (pm25 - cLo)) / (cHi - cLo));
    }
  }
  return 500;
}

export function getAqiCategory(aqi: number) {
  if (aqi <= 50) return AQI_CATEGORIES[0];
  if (aqi <= 100) return AQI_CATEGORIES[1];
  if (aqi <= 200) return AQI_CATEGORIES[2];
  if (aqi <= 300) return AQI_CATEGORIES[3];
  if (aqi <= 400) return AQI_CATEGORIES[4];
  return AQI_CATEGORIES[5];
}

export function pm25ToColor(pm25: number): [number, number, number, number] {
  return hexToRgba(getAqiCategory(pm25ToAqi(pm25)).color);
}

// ─── Color Utilities ──────────────────────────────────────────────────────────

export function hexToRgba(hex: string, alpha = 200): [number, number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return [r, g, b, alpha];
}

/** Continuous PM2.5 → RGBA for H3 choropleth (green → yellow → red → purple) */
export function pm25ToRgbaArray(pm25: number, alpha = 200): [number, number, number, number] {
  // Clamp to [0, 300] then map to a 6-stop gradient
  const stops: Array<{ at: number; r: number; g: number; b: number }> = [
    { at: 0,   r: 0,   g: 176, b: 80  },  // green
    { at: 50,  r: 146, g: 208, b: 80  },  // light green
    { at: 100, r: 255, g: 255, b: 0   },  // yellow
    { at: 200, r: 255, g: 153, b: 0   },  // orange
    { at: 300, r: 255, g: 0,   b: 0   },  // red
    { at: 400, r: 153, g: 0,   b: 76  },  // purple
  ];
  const v = Math.max(0, Math.min(pm25, 400));
  for (let i = 0; i < stops.length - 1; i++) {
    const lo = stops[i], hi = stops[i + 1];
    if (v <= hi.at) {
      const t = (v - lo.at) / (hi.at - lo.at);
      return [
        Math.round(lo.r + t * (hi.r - lo.r)),
        Math.round(lo.g + t * (hi.g - lo.g)),
        Math.round(lo.b + t * (hi.b - lo.b)),
        alpha,
      ];
    }
  }
  return [153, 0, 76, alpha];
}

// ─── Severity Colors (for hotspot zones) ─────────────────────────────────────

export const SEVERITY_COLORS = {
  chronic:  { fill: hexToRgba("#ff0000", 160), border: hexToRgba("#ff0000", 255) },
  emerging: { fill: hexToRgba("#ff9900", 140), border: hexToRgba("#ff9900", 230) },
  acute:    { fill: hexToRgba("#ff6600", 120), border: hexToRgba("#ffcc00", 240) },
} as const;

// ─── Source Category Colors ───────────────────────────────────────────────────

export const SOURCE_COLORS: Record<string, string> = {
  industrial:    "#f87171",
  waste_burning: "#fb923c",
  construction:  "#facc15",
  traffic:       "#60a5fa",
};

// ─── Satellite Channel Colors ─────────────────────────────────────────────────

export const SAT_CHANNEL_COLORS: Record<string, [string, string]> = {
  no2_col: ["#dbeafe", "#1d4ed8"],
  so2_col: ["#fef3c7", "#b45309"],
  aai:     ["#ede9fe", "#7c3aed"],
};
