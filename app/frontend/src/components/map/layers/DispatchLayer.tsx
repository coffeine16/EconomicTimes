"use client";
/**
 * DispatchLayer — draws per-team inspection routes on the map.
 * Each route is a polyline through stop centroids, colored by team.
 * Stop positions are rendered as pins with EPS labels.
 */
import { LineLayer, ScatterplotLayer, TextLayer } from "@deck.gl/layers";
import { icon, Truck } from "@/components/Icon";
import type { DispatchRoute, DispatchStop } from "@/lib/types";

// One hue per team, up to 6. Muted and evenly spaced around the wheel: these
// identify a route, they do not rank it, so none of them may read as an alert.
// (The old set was the Tailwind-500 rainbow, and its red/amber members collided
// with the severity colours the hotspot layer draws underneath.)
const TEAM_COLORS: [number, number, number, number][] = [
  [110, 143, 192, 225],  // steel blue  — T1
  [ 94, 168, 138, 225],  // sage        — T2
  [186, 150,  86, 225],  // brass       — T3
  [174, 122, 158, 225],  // mauve       — T4
  [123, 156, 173, 225],  // slate cyan  — T5
  [163, 149, 118, 225],  // khaki       — T6
];

function teamColor(teamId: string): [number, number, number, number] {
  const idx = parseInt(teamId.replace(/\D/g, ""), 10) - 1;
  return TEAM_COLORS[idx % TEAM_COLORS.length];
}

// Build stop-pair lines for each route
interface RouteLine { from: [number, number]; to: [number, number]; team_id: string }
interface StopPoint { stop: DispatchStop; team_id: string }

export function buildDispatchLayers(
  routes: DispatchRoute[],
  onHover: (info: { x: number; y: number; content: React.ReactNode } | null) => void
) {
  if (!routes.length) return [];

  const lines: RouteLine[] = [];
  const points: StopPoint[] = [];

  for (const route of routes) {
    for (let i = 0; i < route.stops.length - 1; i++) {
      lines.push({
        from: [route.stops[i].lon, route.stops[i].lat],
        to:   [route.stops[i + 1].lon, route.stops[i + 1].lat],
        team_id: route.team_id,
      });
    }
    for (const stop of route.stops) {
      points.push({ stop, team_id: route.team_id });
    }
  }

  const lineLayer = new LineLayer<RouteLine>({
    id: "dispatch-routes",
    data: lines,
    getSourcePosition: (d) => d.from,
    getTargetPosition: (d) => d.to,
    getColor: (d) => teamColor(d.team_id),
    getWidth: 2,
    widthMinPixels: 2,
    widthMaxPixels: 5,
    pickable: false,
  });

  const stopLayer = new ScatterplotLayer<StopPoint>({
    id: "dispatch-stops",
    data: points,
    getPosition: (d) => [d.stop.lon, d.stop.lat],
    getRadius: 320,
    radiusMinPixels: 8,
    radiusMaxPixels: 16,
    getFillColor: (d) => teamColor(d.team_id),
    getLineColor: [255, 255, 255, 200],
    lineWidthMinPixels: 2,
    stroked: true,
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 80],
    onHover: (info) => {
      if (info.object) {
        const { stop, team_id } = info.object as StopPoint;
        onHover({
          x: info.x,
          y: info.y,
          content: (
            <div style={{ minWidth: 180 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, marginBottom: 4 }}>
                <Truck {...icon.sm} aria-hidden />
                Dispatch stop #{stop.seq}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 2 }}>
                Team {team_id} · Zone {stop.zone_id}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Ward {stop.ward_id}
              </div>
              <div className="mono" style={{ fontSize: "0.8rem", color: "var(--caution)", marginTop: 4 }}>
                EPS: {stop.eps.toFixed(1)}
              </div>
            </div>
          ),
        });
      } else onHover(null);
    },
    updateTriggers: { getFillColor: [routes] },
  });

  const labelLayer = new TextLayer<StopPoint>({
    id: "dispatch-labels",
    data: points,
    getPosition: (d) => [d.stop.lon, d.stop.lat],
    getText: (d) => `${d.stop.seq}`,
    getSize: 11,
    getColor: [255, 255, 255, 240],
    getTextAnchor: "middle",
    getAlignmentBaseline: "center",
    fontFamily: "\"JetBrains Mono\", monospace",
    fontWeight: "bold",
    pickable: false,
    getPixelOffset: [0, 0],
  });

  return [lineLayer, stopLayer, labelLayer];
}
