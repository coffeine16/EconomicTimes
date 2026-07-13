import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Repeat Offender Registry — Admin Console",
  description: "Entities attributed repeatedly are escalated through advisory → memo → chronic-offender flag.",
};

export default function RegistryPage() {
  return (
    <div style={{ padding: "var(--space-xl)", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <h1 style={{ marginBottom: 8 }}>Repeat Offender Registry</h1>
        <p>
          Entities attributed ≥ N times within a window are escalated: advisory → memo → chronic-offender flag.
          The accumulated case file (every past attribution + evidence chain) is ready for closure proceedings.
        </p>
      </div>

      <div
        className="card"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 320,
          gap: "var(--space-md)",
          border: "1px dashed var(--border-default)",
        }}
      >
        <span style={{ fontSize: "2rem" }}>🗂️</span>
        <h3 style={{ color: "var(--text-secondary)" }}>RepeatOffenderTable component</h3>
        <p style={{ textAlign: "center", maxWidth: 400, fontSize: "0.875rem" }}>
          Clusters attribution outputs by source location across weeks.
          Shows entity name, # attributions, tier badge, and a link to the full case file.
        </p>
      </div>
    </div>
  );
}
