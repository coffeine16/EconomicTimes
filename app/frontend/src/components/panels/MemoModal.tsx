"use client";
/**
 * MemoModal — the demo climax. One click on an enforcement zone turns into a
 * dispatch-ready enforcement notice: subject, finding, the checkable evidence
 * chain, the DIRECTIVE, and a rule-matched legal basis (statute + provision +
 * penalty). The legal citation is picked deterministically by the memo agent's
 * rule engine; the LLM only drafts the connective prose. Nothing here is invented
 * in the browser — it renders the precomputed memo document verbatim.
 */
import { useEffect } from "react";
import type { Memo } from "@/lib/types";

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "var(--space-lg)" }}>
      <div style={{
        fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.06em",
        textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 6,
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

export default function MemoModal({
  memo, loading, error, onClose,
}: {
  memo: Memo | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "var(--space-lg)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          maxWidth: 680, width: "100%", maxHeight: "88vh", overflowY: "auto",
          padding: "var(--space-xl)", position: "relative",
        }}
      >
        <button
          onClick={onClose}
          className="btn btn-ghost btn-icon"
          style={{ position: "absolute", top: 12, right: 12 }}
          title="Close (Esc)"
        >
          ✕
        </button>

        {loading && (
          <div style={{ padding: "var(--space-2xl)", textAlign: "center", color: "var(--text-tertiary)" }}>
            <div className="skeleton" style={{ height: 20, width: "60%", margin: "0 auto 12px" }} />
            <div className="skeleton" style={{ height: 14, width: "90%", margin: "0 auto 8px" }} />
            <div className="skeleton" style={{ height: 14, width: "80%", margin: "0 auto" }} />
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: "var(--space-2xl)", textAlign: "center" }}>
            <span style={{ fontSize: "1.6rem" }}>📄</span>
            <h3 style={{ margin: "12px 0 6px" }}>Memo unavailable</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-tertiary)" }}>{error}</p>
          </div>
        )}

        {memo && !loading && (
          <>
            {/* Letterhead */}
            <div style={{ borderBottom: "1px solid var(--border-default)", paddingBottom: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", letterSpacing: "0.05em" }}>
                ENFORCEMENT MEMORANDUM
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--accent-blue)", marginTop: 4 }}>
                {memo.memo_id}
              </div>
              <h2 style={{ margin: "10px 0 4px", fontSize: "1.15rem", lineHeight: 1.35 }}>
                {memo.subject}
              </h2>
              <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                {memo.ward_name} · zone {memo.zone_id} · issued {new Date(memo.issued_at).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>

            {memo.background && (
              <Section label="Background">
                <p style={{ fontSize: "0.86rem", lineHeight: 1.55, color: "var(--text-secondary)", margin: 0 }}>
                  {memo.background}
                </p>
              </Section>
            )}

            <Section label="Finding">
              <p style={{ fontSize: "0.86rem", lineHeight: 1.55, color: "var(--text-primary)", margin: 0 }}>
                {memo.finding}
              </p>
            </Section>

            {memo.evidence_chain?.length > 0 && (
              <Section label="Evidence chain">
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.84rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                  {memo.evidence_chain.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </Section>
            )}

            <Section label="Directive">
              <p style={{
                fontSize: "0.86rem", lineHeight: 1.55, margin: 0,
                color: "var(--text-primary)", fontWeight: 500,
                background: "rgba(59,130,246,0.06)", padding: "var(--space-md)",
                borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--accent-blue)",
              }}>
                {memo.directive}
              </p>
            </Section>

            {memo.legal_basis?.length > 0 && (
              <Section label="Legal basis">
                {memo.legal_basis.map((lb) => (
                  <div key={lb.id} style={{
                    border: "1px solid var(--border-default)", borderRadius: "var(--radius-sm)",
                    padding: "var(--space-md)", marginBottom: 8,
                  }}>
                    <div style={{ fontWeight: 600, fontSize: "0.86rem", color: "var(--text-primary)" }}>
                      {lb.statute} — {lb.provision}
                    </div>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "6px 0", lineHeight: 1.5 }}>
                      {lb.summary}
                    </p>
                    <div style={{ fontSize: "0.76rem", color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                      <div><strong>Authority:</strong> {lb.authority}</div>
                      <div><strong>Action:</strong> {lb.action}</div>
                      {lb.penalty && <div><strong>Penalty:</strong> {lb.penalty}</div>}
                    </div>
                  </div>
                ))}
              </Section>
            )}

            <div style={{
              fontSize: "0.72rem", color: "var(--text-tertiary)", fontStyle: "italic",
              borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-md)", lineHeight: 1.5,
            }}>
              Drafted by {memo.drafted_by}. {memo.disclaimer}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
