import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Network Audit — Admin Console",
  description:
    "Monitoring blind spots, sensor anomaly flags, and optimal next-sensor placement recommendations.",
};

export default function AuditPage() {
  return (
    <div style={{ padding: "var(--space-xl)", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <h1 style={{ marginBottom: 8 }}>Monitoring Network Audit</h1>
        <p>
          Cells where satellite + fusion say "high" but no monitor exists → next-sensor placement.
          Stations that read flat while the satellite spikes overhead → malfunction/tampering review.
          Free byproducts of the fusion field. Direct answer to the 2024 CAG audit.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "var(--space-lg)",
        }}
      >
        <div
          className="card"
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", minHeight: 240, gap: "var(--space-md)",
            border: "1px dashed var(--border-default)",
          }}
        >
          <span style={{ fontSize: "2rem" }}>📡</span>
          <h3 style={{ color: "var(--text-secondary)" }}>Blind Spot Map</h3>
          <p style={{ textAlign: "center", fontSize: "0.875rem" }}>
            H3 cells ranked by satellite signal with no nearby monitor.
            Optimal next-sensor placement recommendations.
          </p>
        </div>

        <div
          className="card"
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", minHeight: 240, gap: "var(--space-md)",
            border: "1px dashed var(--border-default)",
          }}
        >
          <span style={{ fontSize: "2rem" }}>⚠️</span>
          <h3 style={{ color: "var(--text-secondary)" }}>Sensor Anomaly Flags</h3>
          <p style={{ textAlign: "center", fontSize: "0.875rem" }}>
            Stations reading flat while the satellite spikes overhead.
            Possible malfunction or tampering — flagged for review.
          </p>
        </div>
      </div>
    </div>
  );
}
