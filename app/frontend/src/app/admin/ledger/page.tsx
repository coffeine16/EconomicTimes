"use client";
import useSWR from "swr";
import { useCity } from "@/lib/CityContext";
import { api } from "@/lib/api";
import { icon, ClipboardList } from "@/components/Icon";
import type { Ledger, LedgerEntry } from "@/lib/types";

/**
 * Intervention Ledger.
 *
 * IMPORTANT — this page mirrors a deliberate honesty split in the backend
 * (intelligence/agents/ledger.py). It reports TWO different things and must never
 * blur them:
 *   1. RESPONSE TIME — real and measured (signal -> memo is automated, seconds vs
 *      the documented weeks of manual cross-agency correlation).
 *   2. EFFECTIVENESS — NOT measured. We never actually intervened, so "realized minus
 *      counterfactual" would credit us for pollution that changed on its own. The
 *      ledger freezes the counterfactual and leaves impact null until a real
 *      intervention (a real actioned_at from the inspector loop) sits between the
 *      frozen forecast and a later outcome.
 * An earlier version of this page rendered a green/red "impact µg/m³" badge and an
 * "Effective (down AQI)" tally — a number the backend explicitly refuses to produce.
 * Do not bring it back.
 */

function StatusPill({ status }: { status: LedgerEntry["status"] }) {
  const map: Record<string, { label: string; variant: string }> = {
    actioned:         { label: "Actioned",         variant: "badge-positive" },
    dispatched:       { label: "Dispatched",       variant: "badge-caution" },
    awaiting_outcome: { label: "Awaiting outcome", variant: "badge-diffuse" },
  };
  const { label, variant } = map[status] ?? map.awaiting_outcome;
  return <span className={`badge ${variant}`}>{label}</span>;
}

function ClaimCard({ title, tone, children }: {
  title: string; tone: "real" | "pending"; children: React.ReactNode;
}) {
  const tint = tone === "real" ? "var(--positive)" : "var(--caution)";
  return (
    <div className="card card-rail" style={{ ["--rail" as string]: tint }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
        <span style={{ fontSize: "0.875rem", fontWeight: 550, color: "var(--text-primary)" }}>{title}</span>
        <span className={`badge ${tone === "real" ? "badge-positive" : "badge-caution"}`}>
          {tone === "real" ? "measured" : "not yet measured"}
        </span>
      </div>
      <p style={{ fontSize: "0.83rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.55 }}>
        {children}
      </p>
    </div>
  );
}

function shortTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—"
    : d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function LedgerTable({ entries }: { entries: LedgerEntry[] }) {
  if (!entries.length) {
    return (
      <div className="empty" style={{ border: "none", minHeight: 240 }}>
        <ClipboardList {...icon.lg} aria-hidden />
        <h3>No actions tracked yet</h3>
        <p>
          Run the pipeline to generate an enforcement queue. Each action is logged here
          with its response chain and a frozen counterfactual.
        </p>
      </div>
    );
  }
  const cols = ["Action", "Ward", "Source", "Signal", "Memo drafted",
                "Counterfactual +48h", "Response", "Status"];
  return (
    <div className="scroll-x">
      <table className="data-table">
        <thead>
          <tr>{cols.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.action_id}>
              <td className="mono" style={{ color: "var(--text-primary)" }}>
                {e.action_id} · {e.zone_id}
              </td>
              <td>{e.ward_name ?? e.ward_id}</td>
              <td>{e.source ?? "—"}</td>
              <td style={{ fontSize: "0.78rem" }}>{shortTime(e.response?.signal_at)}</td>
              <td style={{ fontSize: "0.78rem" }}>{shortTime(e.response?.memo_drafted_at)}</td>
              <td className="mono">
                {e.counterfactual
                  ? `AQI ${e.counterfactual.aqi_counterfactual} · ${e.counterfactual.band_counterfactual}`
                  : "—"}
              </td>
              <td className="mono">
                {e.response?.response_hours != null ? `${e.response.response_hours.toFixed(1)}h` : "auto"}
              </td>
              <td><StatusPill status={e.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LedgerPage() {
  const { city } = useCity();
  const { data, isLoading } = useSWR<Ledger | null>([city, "ledger"], () => api.cityLedger(city));
  const entries = data?.entries ?? [];
  const actioned = entries.filter((e) => e.status === "actioned").length;

  return (
    <div className="page" style={{ maxWidth: 1200, overflowY: "auto", height: "100%" }}>
      <div className="page-head">
        <h1>Intervention ledger</h1>
        <p>
          The ledger reports two things, and keeps them apart on purpose:
          <strong> how fast</strong> a signal becomes a cited, dispatchable memo, and
          <strong> whether the intervention worked</strong>. The first is measured today;
          the second is a mechanism that accrues evidence as real interventions occur.
        </p>
      </div>

      <div className="grid-auto" style={{ ["--min" as string]: "320px", marginBottom: "var(--space-xl)" }}>
        <ClaimCard title="Response time" tone="real">
          Signal → attribution → cited memo → dispatch route is a single automated batch.
          The manual baseline — correlating a satellite signal to a served notice across
          agencies — is documented in <strong>weeks</strong> (CAG, 2024). That is the
          reduction: weeks → one automated run, no human correlation step.
        </ClaimCard>
        <ClaimCard title="Effectiveness" tone="pending">
          Intervention effectiveness requires a real intervention between the frozen
          counterfactual and a realized outcome. Nobody has acted on these yet, so we do
          not claim an impact number — attributing natural change to ourselves would be
          dishonest. {actioned}/{entries.length} actions actioned so far.
        </ClaimCard>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 44 }} />)}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <LedgerTable entries={entries} />
        </div>
      )}
    </div>
  );
}
