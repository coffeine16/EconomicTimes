"use client";
/**
 * FireLayer — scatter plot of FIRMS thermal anomaly detections.
 * Sized by FRP (fire radiative power), pulsing red/orange.
 */
import { ScatterplotLayer } from "@deck.gl/layers";
import { FIRE_HEX, hexToRgba } from "@/lib/colors";
import { icon, Flame } from "@/components/Icon";
import type { FireDetection } from "@/hooks/useMapData";

export function buildFireLayer(
  fires: FireDetection[],
  onHover: (info: { x: number; y: number; content: React.ReactNode } | null) => void
) {
  if (!fires.length) return null;
  return new ScatterplotLayer<FireDetection>({
    id: "fires",
    data: fires,
    getPosition: (d) => [d.lon, d.lat],
    getRadius: (d) => Math.max(300, Math.min(1200, d.frp * 30)),
    radiusMinPixels: 4,
    radiusMaxPixels: 24,
    getFillColor: (d) => {
      const [r, g, b] = hexToRgba(d.confidence >= 0.7 ? FIRE_HEX.high : FIRE_HEX.low);
      return [r, g, b, Math.round(175 + d.confidence * 60)];
    },
    getLineColor: [255, 255, 255, 90],
    lineWidthMinPixels: 1,
    stroked: true,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 80],
    onHover: (info) => {
      if (info.object) {
        const d = info.object as FireDetection;
        const ageH = Math.round(
          (Date.now() - new Date(d.acquired_at).getTime()) / 3_600_000
        );
        onHover({
          x: info.x,
          y: info.y,
          content: (
            <div style={{ minWidth: 180 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, marginBottom: 4 }}>
                <Flame {...icon.sm} aria-hidden />
                FIRMS detection
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.85rem", marginBottom: 4 }}>
                FRP: {d.frp.toFixed(1)} MW
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Confidence: {(d.confidence * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", marginTop: 6 }}>
                {ageH}h ago
              </div>
            </div>
          ),
        });
      } else onHover(null);
    },
    updateTriggers: { getFillColor: [fires], getRadius: [fires] },
  });
}
