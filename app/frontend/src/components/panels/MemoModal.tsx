"use client";
/**
 * MemoModal — the demo climax. One click on an enforcement zone turns into a
 * dispatch-ready enforcement notice: subject, finding, the checkable evidence
 * chain, the DIRECTIVE, and a rule-matched legal basis (statute + provision +
 * penalty). The legal citation is picked deterministically by the memo agent's
 * rule engine; the LLM only drafts the connective prose. Nothing here is invented
 * in the browser — it renders the precomputed memo document verbatim.
 *
 * ⚠ IT MUST BE PORTALLED TO <body>. It is rendered from inside a ZoneCard, deep
 * in the scrolling Action Queue, and `position: fixed` does NOT escape an
 * ancestor that establishes a containing block — which ANY ancestor carrying a
 * transform, filter, backdrop-filter, will-change or a transform ANIMATION does.
 * (The queue's cards animate in; that alone was enough to trap the overlay
 * inside the 372px panel, where it rendered as unreadable text stacked over the
 * cards behind it, with the scrim covering nothing.) A portal makes the modal
 * independent of wherever it happens to be invoked from. Do not "fix" a future
 * recurrence by raising z-index — z-index cannot escape a containing block.
 *
 * Presentation note: this reads as a LEGAL DOCUMENT, not a dashboard card —
 * serif-free but letter-spaced letterhead, ruled sections, generous measure. It
 * is the artifact an officer would actually sign, so it should not look like a
 * tooltip.
 */
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { icon, FileText, X } from "@/components/Icon";
import { getAqiCategory } from "@/lib/colors";
import { SOURCE_LABELS, PERSISTENCE_LABELS } from "@/lib/constants";
import type { Memo, SourceCategory } from "@/lib/types";

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "var(--space-lg)" }}>
      <div className="section-label" style={{ marginBottom: 7 }}>{label}</div>
      {children}
    </section>
  );
}

/** One scannable figure in the header strip. */
function Figure({ label, value, tint }: { label: string; value: string; tint?: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="section-label" style={{ fontSize: "0.6rem", marginBottom: 3 }}>{label}</div>
      <div
        className="mono truncate"
        style={{ fontSize: "0.9rem", fontWeight: 550, color: tint ?? "var(--text-primary)", lineHeight: 1.2 }}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * The deterministic facts, above the prose. The memo agent already computes
 * these; the modal previously buried them inside paragraphs, so the first thing
 * a reader met was three sentences of generated English rather than the numbers
 * those sentences describe. Confidence is tinted by the same thresholds the
 * Action Queue meter uses, so 0.52 does not read as reassuring here and cautious
 * there.
 */
function SituationStrip({ memo }: { memo: Memo }) {
  const s = memo.situation;
  if (!s) return null;
  const band = getAqiCategory(s.aqi);
  const confTint =
    s.confidence >= 0.7 ? "var(--positive)"
    : s.confidence >= 0.5 ? "var(--caution)"
    : "var(--critical)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
        gap: "var(--space-md)",
        padding: "12px var(--space-md)",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        marginBottom: "var(--space-lg)",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div className="section-label" style={{ fontSize: "0.6rem", marginBottom: 3 }}>AQI</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: band.color, flexShrink: 0 }} />
          <span className="mono" style={{ fontSize: "0.9rem", fontWeight: 550, lineHeight: 1.2 }}>
            {s.aqi}
          </span>
          <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>{s.aqi_category}</span>
        </div>
      </div>
      <Figure label="PM2.5" value={`${s.pm25.toFixed(1)} µg/m³`} />
      <Figure label="Source" value={SOURCE_LABELS[s.source as SourceCategory] ?? s.source} />
      <Figure label="Confidence" value={s.confidence.toFixed(2)} tint={confTint} />
      <Figure label="Persistence" value={PERSISTENCE_LABELS[s.kind] ?? s.kind} />
      <Figure label="Extent" value={`${s.n_cells} cell${s.n_cells === 1 ? "" : "s"}`} />
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
  const dialogRef = useRef<HTMLDivElement>(null);

  // Escape to close, and lock the page behind the dialog so scrolling the
  // overlay doesn't scroll the queue underneath it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  // Move focus into the dialog on open and hand it back on close, so a keyboard
  // user isn't left tabbing through the queue behind an open modal.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  // No mount-flag state needed: ActionQueue (our only caller) is imported with
  // `dynamic(..., { ssr: false })`, so this never renders on the server. The
  // guard is belt-and-braces for a future caller that does.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: "var(--z-toast)",
        background: "var(--scrim)",
        backdropFilter: "blur(3px)",
        WebkitBackdropFilter: "blur(3px)",
        animation: "fadeIn 0.14s var(--ease) both",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "var(--space-lg)",
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Enforcement memorandum"
        style={{
          maxWidth: 660, width: "100%", maxHeight: "86vh", overflowY: "auto",
          padding: "var(--space-xl)", position: "relative",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-lg)",
          outline: "none",
        }}
      >
        <button
          onClick={onClose}
          className="btn btn-quiet btn-icon"
          style={{ position: "absolute", top: 10, right: 10 }}
          title="Close (Esc)"
          aria-label="Close memo"
        >
          <X {...icon.md} aria-hidden />
        </button>

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "var(--space-lg) 0" }}>
            <div className="skeleton" style={{ height: 11, width: "34%" }} />
            <div className="skeleton" style={{ height: 22, width: "72%" }} />
            <div className="skeleton" style={{ height: 1, width: "100%", marginBottom: 6 }} />
            <div className="skeleton" style={{ height: 12, width: "100%" }} />
            <div className="skeleton" style={{ height: 12, width: "94%" }} />
            <div className="skeleton" style={{ height: 12, width: "60%" }} />
          </div>
        )}

        {error && !loading && (
          <div className="empty" style={{ border: "none" }}>
            <FileText {...icon.lg} aria-hidden />
            <h3>Memo unavailable</h3>
            <p>{error}</p>
          </div>
        )}

        {memo && !loading && (
          <>
            {/* Letterhead */}
            <header
              style={{
                borderBottom: "1px solid var(--border-default)",
                paddingBottom: "var(--space-md)",
                marginBottom: "var(--space-lg)",
                paddingRight: 32,
              }}
            >
              <div
                style={{
                  display: "flex", alignItems: "baseline",
                  justifyContent: "space-between", gap: "var(--space-md)",
                  flexWrap: "wrap", marginBottom: 10,
                }}
              >
                <span className="section-label">Enforcement memorandum</span>
                <span className="mono" style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>
                  {memo.memo_id}
                </span>
              </div>
              <h2 style={{ fontSize: "1.1rem", lineHeight: 1.4, marginBottom: 6 }}>
                {memo.subject}
              </h2>
              <div style={{ fontSize: "0.775rem", color: "var(--text-tertiary)" }}>
                {memo.ward_name} · zone {memo.zone_id} · issued{" "}
                {new Date(memo.issued_at).toLocaleString("en-IN", {
                  day: "numeric", month: "short", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </div>
            </header>

            <SituationStrip memo={memo} />

            {memo.background && (
              <Section label="Background">
                <p style={{ fontSize: "0.86rem", lineHeight: 1.65, margin: 0 }}>
                  {memo.background}
                </p>
              </Section>
            )}

            <Section label="Finding">
              <p style={{ fontSize: "0.86rem", lineHeight: 1.65, color: "var(--text-primary)", margin: 0 }}>
                {memo.finding}
              </p>
            </Section>

            {memo.evidence_chain?.length > 0 && (
              <Section label="Evidence chain">
                <ul
                  style={{
                    margin: 0, paddingLeft: 17, fontSize: "0.845rem",
                    lineHeight: 1.65, color: "var(--text-secondary)",
                    display: "flex", flexDirection: "column", gap: 4,
                  }}
                >
                  {memo.evidence_chain.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </Section>
            )}

            {/* The operative paragraph — the one thing on the page that is an
                instruction rather than a description, so it is the only tinted
                block in the document. */}
            <Section label="Directive">
              <p
                style={{
                  fontSize: "0.86rem", lineHeight: 1.65, margin: 0,
                  color: "var(--text-primary)", fontWeight: 500,
                  background: "var(--accent-soft)", padding: "var(--space-md)",
                  borderRadius: "var(--radius-md)", borderLeft: "2px solid var(--accent)",
                }}
              >
                {memo.directive}
              </p>
            </Section>

            {memo.legal_basis?.length > 0 && (
              <Section label="Legal basis">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {memo.legal_basis.map((lb) => (
                    <div
                      key={lb.id}
                      style={{
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-md)",
                        background: "var(--bg-secondary)",
                        padding: "var(--space-md)",
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: "0.86rem", color: "var(--text-primary)" }}>
                        {lb.statute}
                        <span style={{ color: "var(--text-tertiary)", fontWeight: 450 }}>
                          {" "}· {lb.provision}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.8rem", margin: "6px 0 10px", lineHeight: 1.55 }}>
                        {lb.summary}
                      </p>
                      {/* Definition list, not three bolded run-on lines: these
                          are three distinct fields an officer scans for. */}
                      <dl
                        style={{
                          display: "grid", gridTemplateColumns: "auto 1fr",
                          gap: "3px var(--space-md)", fontSize: "0.76rem", lineHeight: 1.5,
                          margin: 0,
                        }}
                      >
                        <dt className="section-label" style={{ fontSize: "0.62rem", paddingTop: 2 }}>Authority</dt>
                        <dd style={{ color: "var(--text-secondary)" }}>{lb.authority}</dd>
                        <dt className="section-label" style={{ fontSize: "0.62rem", paddingTop: 2 }}>Action</dt>
                        <dd style={{ color: "var(--text-secondary)" }}>{lb.action}</dd>
                        {lb.penalty && (
                          <>
                            <dt className="section-label" style={{ fontSize: "0.62rem", paddingTop: 2 }}>Penalty</dt>
                            <dd style={{ color: "var(--text-secondary)" }}>{lb.penalty}</dd>
                          </>
                        )}
                      </dl>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <footer
              style={{
                fontSize: "0.72rem", color: "var(--text-tertiary)", lineHeight: 1.55,
                borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-md)",
              }}
            >
              Drafted by {memo.drafted_by}. {memo.disclaimer}
            </footer>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
