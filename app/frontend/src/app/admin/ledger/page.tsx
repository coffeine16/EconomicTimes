import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Intervention Ledger — Admin Console",
  description: "Counterfactual intervention ledger: measured impact of each enforcement action.",
};

export default function LedgerPage() {
  return (
    <div style={{ padding: "var(--space-xl)", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: "var(--space-xl)" }}>
        <h1 style={{ marginBottom: 8 }}>Intervention Ledger</h1>
        <p>
          Each enforcement action is measured against its frozen counterfactual forecast.
          Realized AQI minus counterfactual, accumulated over 48–72 h, is the action&apos;s measured impact.
        </p>
      </div>

      {/* Placeholder — LedgerTable component to be built in next phase */}
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
        <span style={{ fontSize: "2rem" }}>📋</span>
        <h3 style={{ color: "var(--text-secondary)" }}>LedgerTable component</h3>
        <p style={{ textAlign: "center", maxWidth: 400, fontSize: "0.875rem" }}>
          Loads from <code>GET /ledger</code> (not yet built).
          Falls back to <code>/data/ledger.json</code> stub.
          Shows memo ID, dispatch time, response hours, counterfactual vs realized AQI, and measured impact.
        </p>
      </div>
    </div>
  );
}
