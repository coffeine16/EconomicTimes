"use client";
import { useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import type { Hotspot, Attribution } from "@/lib/types";
import { SOURCE_LABELS, PERSISTENCE_LABELS } from "@/lib/constants";
import { SOURCE_COLORS } from "@/lib/colors";

interface Props {
  hotspots: Hotspot[];
  loading: boolean;
  selectedCell: string | null;
  onSelectCell: (cell: string) => void;
}

function ConfidenceMeter({ value }: { value: number }) {
  const color = value >= 0.7 ? "#10b981" : value >= 0.5 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          flex: 1, height: 4, background: "var(--border-subtle)",
          borderRadius: "var(--radius-full)", overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.round(value * 100)}%`,
            height: "100%",
            background: color,
            borderRadius: "var(--radius-full)",
            transition: "width 0.5s ease-out",
          }}
        />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color, minWidth: 30 }}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function EvidenceChain({ attribution }: { attribution: Attribution }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
      {/* Reason */}
      <div
        style={{
          padding: "10px 12px",
          background: "var(--bg-primary)",
          borderRadius: "var(--radius-sm)",
          fontSize: "0.82rem",
          lineHeight: 1.6,
          color: "var(--text-secondary)",
          borderLeft: `3px solid ${SOURCE_COLORS[attribution.primary_source] ?? "#666"}`,
        }}
      >
        {attribution.reason}
      </div>

      {/* Evidence factors */}
      {attribution.evidence_factors.length > 0 && (
        <div>
          <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--text-tertiary)", marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Evidence factors
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {attribution.evidence_factors.map((f, i) => (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 8,
                  fontSize: "0.78rem", color: "var(--text-secondary)",
                }}
              >
                <span style={{ color: "var(--accent-emerald)", marginTop: 1, flexShrink: 0 }}>✓</span>
                {f}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Meteorology */}
      {attribution.evidence?.meteorology && (
        <div style={{ display: "flex", gap: "var(--space-md)", fontSize: "0.75rem", color: "var(--text-tertiary)", flexWrap: "wrap" }}>
          <span>💨 Wind: {attribution.evidence.meteorology.wind_from_deg}° · {attribution.evidence.meteorology.wind_ms.toFixed(1)} m/s</span>
          <span>🌡 BLH: {attribution.evidence.meteorology.blh_m}m
            {attribution.evidence.meteorology.air_trapped && " ⚠ trapped"}
          </span>
        </div>
      )}

      <div style={{ fontSize: "0.68rem", color: "var(--text-tertiary)" }}>
        Explained by: {attribution.explained_by}
      </div>
    </div>
  );
}

function ActionCard({ hotspot, isSelected, onSelect }: {
  hotspot: Hotspot;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(isSelected);
  const { data: attribution, isLoading: loadingAttr } = useSWR<Attribution>(
    expanded ? ["attribution", hotspot.cell] : null,
    () => api.getAttribution(hotspot.cell)
  );

  const sourceColor = attribution ? SOURCE_COLORS[attribution.primary_source] : "#888";

  return (
    <div
      className="card"
      style={{
        borderColor: isSelected ? "var(--accent-blue)" : "var(--border-subtle)",
        background: isSelected ? "rgba(59,130,246,0.04)" : undefined,
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      {/* Header row */}
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, cursor: "pointer" }}
        onClick={() => { onSelect(); setExpanded((e) => !e); }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span className={`badge badge-${hotspot.kind}`}>{hotspot.kind}</span>
            {hotspot.attributable
              ? <span className="badge badge-attributable">Enforceable</span>
              : <span className="badge badge-diffuse">Diffuse</span>
            }
          </div>
          <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "var(--text-primary)", marginBottom: 2 }} className="truncate">
            {hotspot.zone_id} · {hotspot.ward_name}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
            {hotspot.pm25_med.toFixed(1)} µg/m³ · z={hotspot.z_w30d.toFixed(1)}
          </div>
        </div>

        {/* Severity */}
        <div style={{ textAlign: "center", flexShrink: 0, marginLeft: "var(--space-sm)" }}>
          <div
            style={{
              width: 44, height: 44, borderRadius: "var(--radius-sm)",
              background: `rgba(239,68,68,${hotspot.severity.toFixed(2)})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "white" }}>
              {(hotspot.severity * 100).toFixed(0)}
            </span>
          </div>
          <div style={{ fontSize: "0.6rem", color: "var(--text-tertiary)", marginTop: 2 }}>SEV</div>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded((e) => !e)}
        style={{
          display: "flex", alignItems: "center", gap: 4,
          background: "none", border: "none", cursor: "pointer",
          fontSize: "0.75rem", color: "var(--text-tertiary)",
          fontFamily: "var(--font-sans)", padding: 0, marginBottom: expanded ? 10 : 0,
        }}
      >
        {expanded ? "▲ Collapse" : "▼ Evidence chain"}
      </button>

      {/* Expanded: attribution evidence */}
      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          {/* Attribution */}
          {attribution ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "var(--radius-full)",
                      background: (sourceColor) + "20",
                      color: sourceColor,
                      border: `1px solid ${sourceColor}40`,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                    }}
                  >
                    {SOURCE_LABELS[attribution.primary_source] ?? attribution.primary_source}
                  </span>
                </div>
                <ConfidenceMeter value={attribution.confidence} />
              </div>
              <EvidenceChain attribution={attribution} />
            </>
          ) : loadingAttr ? (
            <div className="skeleton" style={{ height: 80, borderRadius: "var(--radius-sm)" }} />
          ) : (
            <div style={{ fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
              No attribution available (hotspot may be diffuse)
            </div>
          )}

          {/* Detection basis */}
          <div style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", borderTop: "1px solid var(--border-subtle)", paddingTop: 8 }}>
            {hotspot.detection_basis}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "var(--space-sm)" }}>
            <button className="btn btn-amber btn-sm" disabled style={{ flex: 1, justifyContent: "center" }}>
              📋 Generate Memo
            </button>
            <button className="btn btn-ghost btn-sm" disabled style={{ flex: 1, justifyContent: "center" }}>
              🗺️ Dispatch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ActionQueue({ hotspots, loading, selectedCell, onSelectCell }: Props) {
  // Sort by severity desc
  const sorted = [...hotspots].sort((a, b) => b.severity - a.severity);
  const enforceable = sorted.filter((h) => h.attributable);
  const diffuse = sorted.filter((h) => !h.attributable);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Panel header */}
      <div
        style={{
          padding: "12px var(--space-md)",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h4>Action Queue</h4>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
            {enforceable.length} enforceable
          </span>
        </div>
        <p style={{ fontSize: "0.75rem" }}>Sorted by severity · Expand for evidence chain</p>
      </div>

      {/* Scrollable list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-sm)" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 88, borderRadius: "var(--radius-md)" }} />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", height: 200,
              color: "var(--text-tertiary)", fontSize: "0.875rem", textAlign: "center", gap: 8,
            }}
          >
            <span style={{ fontSize: "2rem" }}>⬡</span>
            No hotspots detected. Run the detection agent to refresh.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            {/* Enforceable */}
            {enforceable.length > 0 && (
              <>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase", padding: "4px 4px" }}>
                  Enforceable ({enforceable.length})
                </div>
                {enforceable.map((h) => (
                  <ActionCard
                    key={h.cell}
                    hotspot={h}
                    isSelected={selectedCell === h.cell}
                    onSelect={() => onSelectCell(h.cell)}
                  />
                ))}
              </>
            )}

            {/* Diffuse */}
            {diffuse.length > 0 && (
              <>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-tertiary)", letterSpacing: "0.06em", textTransform: "uppercase", padding: "4px 4px", marginTop: 8 }}>
                  Diffuse / Policy ({diffuse.length})
                </div>
                {diffuse.map((h) => (
                  <ActionCard
                    key={h.cell}
                    hotspot={h}
                    isSelected={selectedCell === h.cell}
                    onSelect={() => onSelectCell(h.cell)}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
