"use client";
/**
 * MapContainer — Deck.gl + MapLibre GL base map.
 * Renders the full-bleed interactive map with all toggleable layers.
 */
import { useState, useCallback, useMemo } from "react";
import Map from "react-map-gl/maplibre";
import DeckGL from "@deck.gl/react";
import { H3HexagonLayer } from "@deck.gl/geo-layers";
import { ScatterplotLayer, LineLayer, GeoJsonLayer } from "@deck.gl/layers";
import "maplibre-gl/dist/maplibre-gl.css";

import { INITIAL_VIEW_STATE, MAP_STYLE } from "@/lib/constants";
import { pm25ToRgbaArray, SEVERITY_COLORS, hexToRgba } from "@/lib/colors";
import type { FusionCell, Hotspot, LayerVisibility, MapFilters } from "@/lib/types";

interface Props {
  layers: LayerVisibility;
  filters: MapFilters;
  fusionCells: FusionCell[];
  hotspots: Hotspot[];
  hourOffset: number;
  selectedCell: string | null;
  onCellClick: (cell: string | null) => void;
}

export default function MapContainer({
  layers,
  filters,
  fusionCells,
  hotspots,
  selectedCell,
  onCellClick,
}: Props) {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null);

  // ── Layer: Fusion PM2.5 choropleth ──────────────────────────────────────────
  const fusionLayer = useMemo(() =>
    layers.fusion && fusionCells.length > 0
      ? new H3HexagonLayer<FusionCell>({
          id: "fusion-choropleth",
          data: fusionCells,
          getHexagon: (d) => d.cell,
          getFillColor: (d) => pm25ToRgbaArray(d.pm25, 180),
          getElevation: (d) => Math.max(0, d.pm25 * 5),   // subtle 3D extrusion
          elevationScale: 1,
          extruded: false,
          wireframe: false,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 40],
          onHover: (info) => {
            if (info.object) {
              const d = info.object as FusionCell;
              setTooltip({
                x: info.x, y: info.y,
                content: (
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Fusion PM2.5</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem" }}>
                      {d.pm25.toFixed(1)} µg/m³
                    </div>
                    <div style={{ color: "var(--text-tertiary)", fontSize: "0.75rem", marginTop: 4 }}>
                      {d.cell} · {d.ward_id}
                    </div>
                  </div>
                ),
              });
            } else setTooltip(null);
          },
          onClick: (info) => {
            if (info.object) onCellClick((info.object as FusionCell).cell);
          },
          updateTriggers: { getFillColor: [fusionCells] },
        })
      : null,
    [layers.fusion, fusionCells, onCellClick]
  );

  // ── Layer: Hotspot zones ─────────────────────────────────────────────────────
  const hotspotLayer = useMemo(() =>
    layers.hotspots && hotspots.length > 0
      ? new H3HexagonLayer<Hotspot>({
          id: "hotspot-zones",
          data: hotspots,
          getHexagon: (d) => d.cell,
          getFillColor: (d) => SEVERITY_COLORS[d.kind]?.fill ?? hexToRgba("#888", 100),
          getLineColor: (d) => SEVERITY_COLORS[d.kind]?.border ?? hexToRgba("#888", 200),
          getLineWidth: (d) => d.kind === "chronic" ? 3 : d.kind === "emerging" ? 2 : 1.5,
          lineWidthMinPixels: 1.5,
          extruded: false,
          wireframe: true,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 60],
          onHover: (info) => {
            if (info.object) {
              const d = info.object as Hotspot;
              setTooltip({
                x: info.x, y: info.y,
                content: (
                  <div style={{ minWidth: 200 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ fontWeight: 600 }}>{d.zone_id}</span>
                      <span className={`badge badge-${d.kind}`}>{d.kind}</span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4 }}>
                      {d.ward_name}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)" }}>PM2.5: {d.pm25_med.toFixed(1)} µg/m³</div>
                    <div style={{ color: "var(--text-tertiary)", fontSize: "0.75rem", marginTop: 4 }}>
                      Severity: {(d.severity * 100).toFixed(0)}% · {d.attributable ? "Enforceable" : "Diffuse"}
                    </div>
                    <div style={{ color: "var(--text-tertiary)", fontSize: "0.7rem", marginTop: 4, maxWidth: 220 }}>
                      {d.detection_basis}
                    </div>
                  </div>
                ),
              });
            } else setTooltip(null);
          },
          onClick: (info) => {
            if (info.object) onCellClick((info.object as Hotspot).cell);
          },
          updateTriggers: { getFillColor: [hotspots], getLineColor: [hotspots] },
        })
      : null,
    [layers.hotspots, hotspots, onCellClick]
  );

  // ── Combine active deck.gl layers ────────────────────────────────────────────
  const deckLayers = useMemo(
    () => [fusionLayer, hotspotLayer].filter(Boolean),
    [fusionLayer, hotspotLayer]
  );

  return (
    <div className="map-container" style={{ background: "#06090f" }}>
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => setViewState(vs as typeof INITIAL_VIEW_STATE)}
        controller={true}
        layers={deckLayers}
        getCursor={({ isDragging }) => isDragging ? "grabbing" : "crosshair"}
      >
        <Map
          mapStyle={MAP_STYLE}
          attributionControl={{ compact: true }}
        />
      </DeckGL>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="glass"
          style={{
            position: "absolute",
            left: tooltip.x + 12,
            top: tooltip.y + 12,
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            pointerEvents: "none",
            zIndex: "var(--z-overlay)",
            maxWidth: 280,
            fontSize: "0.85rem",
            boxShadow: "var(--shadow-lg)",
            animation: "fadeIn 0.15s ease-out",
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
