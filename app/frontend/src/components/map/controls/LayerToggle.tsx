"use client";
import { LAYER_LABELS, LAYER_ICONS } from "@/lib/constants";
import type { LayerVisibility, LayerId } from "@/lib/types";
import { icon } from "@/components/Icon";

const LAYER_ORDER: LayerId[] = [
  "fusion", "stations", "satellite", "hotspots",
  "fires", "wards", "blindspots", "dispatch"
];

interface Props {
  layers: LayerVisibility;
  onToggle: (id: LayerId) => void;
}

/**
 * Layer visibility. Each row is a real checkbox semantically (aria-pressed),
 * and state is carried by the icon's OPACITY plus a hairline rail rather than
 * by a blue-tinted row background — over a map, tinted rows compete with the
 * data underneath. The emoji column (🟥📍🛰🔥🗺👁🚗) is now Lucide, so the
 * glyphs share the label's colour and optical weight.
 */
export default function LayerToggle({ layers, onToggle }: Props) {
  return (
    <div
      className="glass"
      style={{
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        minWidth: 176,
        boxShadow: "var(--shadow-md)",
      }}
    >
      <div
        className="section-label"
        style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)" }}
      >
        Layers
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: 4, gap: 1 }}>
        {LAYER_ORDER.map((id) => {
          const Glyph = LAYER_ICONS[id];
          const on = layers[id];
          return (
            <button
              key={id}
              onClick={() => onToggle(id)}
              aria-pressed={on}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                padding: "6px 8px",
                borderRadius: "var(--radius-sm)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                color: on ? "var(--text-primary)" : "var(--text-tertiary)",
                fontSize: "0.78rem",
                fontWeight: on ? 520 : 450,
                fontFamily: "inherit",
                transition: "color var(--transition-fast), background var(--transition-fast)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span
                aria-hidden
                style={{
                  width: 2, height: 14, borderRadius: 1, flexShrink: 0,
                  background: on ? "var(--accent)" : "transparent",
                  transition: "background var(--transition-fast)",
                }}
              />
              <Glyph
                {...icon.md}
                aria-hidden
                style={{ opacity: on ? 1 : 0.5, flexShrink: 0 }}
              />
              <span className="truncate">{LAYER_LABELS[id]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
