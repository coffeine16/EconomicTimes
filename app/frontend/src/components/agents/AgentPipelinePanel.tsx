"use client";
/**
 * AgentPipelinePanel — the 9-agent LangGraph pipeline as a proper vertical flow,
 * in a slide-in drawer. This is where the "it's genuinely agentic" story is told:
 * each agent is a row with an icon, name, one-line description and live status,
 * connected top-to-bottom as a pipeline. Kept OUT of the map so neither clutters
 * the other.
 *
 * "Run Full Pipeline" triggers the batch chain via the backend (POST /run/agent),
 * streaming per-agent status. With no backend (static deploy) the drawer is still
 * the architecture explainer — the flow, in order, with what each agent does.
 */
import type { AgentState, AgentName } from "@/lib/types";
import { AGENT_LABELS, AGENT_DESCRIPTIONS, AGENT_ORDER, AGENT_ICONS } from "@/lib/constants";
import { icon, X, Play, LoaderCircle, Check } from "@/components/Icon";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useCity } from "@/lib/CityContext";

const STATUS = {
  idle:    { color: "var(--text-tertiary)", ring: "var(--border-default)", label: "" },
  running: { color: "var(--accent)",        ring: "var(--accent)",         label: "running" },
  done:    { color: "var(--positive)",      ring: "var(--positive-line)",  label: "done" },
  error:   { color: "var(--critical)",      ring: "var(--critical-line)",  label: "failed" },
} as const;

export default function AgentPipelinePanel({
  open, onClose, agents, running, onRun, onReset,
}: {
  open: boolean;
  onClose: () => void;
  agents: AgentState[];
  running: boolean;
  onRun: (agent: AgentName | "all") => void;
  onReset: () => void;
}) {
  const { city } = useCity();
  const { data: apiHealth } = useSWR("api-health", () => api.getApiHealth(),
    { revalidateOnFocus: false, shouldRetryOnError: false });
  // The API is multi-city: a run carries `?city=` and executes against the city
  // on screen. What can still go wrong is that the backend has no pipeline
  // output for this city on disk — so THAT is the condition worth warning about,
  // not which city the API happens to default to.
  const hasBackend = Boolean(apiHealth?.ok);
  const available = apiHealth?.cities_available ?? null;
  const cityUnavailable = hasBackend && available !== null && !available.includes(city);

  const stateOf = (n: AgentName) => agents.find((a) => a.name === n)?.status ?? "idle";
  const durOf = (n: AgentName) => agents.find((a) => a.name === n)?.duration_ms;
  const doneCount = agents.filter((a) => a.status === "done").length;
  const anyDone = agents.some((a) => a.status === "done" || a.status === "error");

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: "var(--z-modal)",
          background: "var(--scrim)",
          backdropFilter: "blur(2px)",
          opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none",
          transition: "opacity var(--transition-normal)",
        }}
        aria-hidden
      />
      {/* Drawer — SOLID, not glass: this is a content panel, and a translucent
          one lets the map bleed through the text and reads as broken. */}
      <aside
        style={{
          position: "fixed", top: 0, bottom: 0, right: 0,
          width: "min(400px, 90vw)", zIndex: "calc(var(--z-modal) + 1)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          visibility: open ? "visible" : "hidden",
          transition: "transform var(--transition-slow), visibility var(--transition-slow)",
          background: "var(--bg-primary)",
          borderLeft: "1px solid var(--border-default)",
          display: "flex", flexDirection: "column",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "var(--space-md) var(--space-lg)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div>
              <h3 style={{ margin: 0 }}>Agent Pipeline</h3>
              <div style={{ fontSize: "0.74rem", color: "var(--text-tertiary)", marginTop: 2 }}>
                {AGENT_ORDER.length} agents · LangGraph · detect → dispatch
              </div>
            </div>
            <button onClick={onClose} className="btn btn-quiet btn-icon" aria-label="Close pipeline panel">
              <X {...icon.md} aria-hidden />
            </button>
          </div>

          {/* Progress rail — a run's state at a glance, without reading nine rows. */}
          <div
            className="meter"
            style={{ marginTop: "var(--space-md)", height: 2, ["--tint" as string]: "var(--positive)" }}
          >
            <i style={{ width: `${(doneCount / AGENT_ORDER.length) * 100}%` }} />
          </div>

          <div style={{ display: "flex", gap: "var(--space-sm)", marginTop: "var(--space-md)" }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onRun("all")}
              disabled={running}
              style={{ flex: 1 }}
            >
              {running ? (
                <>
                  <LoaderCircle {...icon.sm} className="animate-spin" aria-hidden />
                  Running {doneCount}/{AGENT_ORDER.length}
                </>
              ) : (
                <>
                  <Play {...icon.sm} aria-hidden />
                  Run full pipeline
                </>
              )}
            </button>
            {anyDone && !running && (
              <button className="btn btn-ghost btn-sm" onClick={onReset}>Reset</button>
            )}
          </div>

          {/* Say so BEFORE the click rather than letting it surface as nine red
              FAILED badges: the agents read precomputed artifacts, and this city
              has none on the server. Browsing is unaffected — the map, queue and
              citizen view come from that city's static bundle. */}
          {cityUnavailable && (
            <p className="alert alert-caution" style={{ marginTop: "var(--space-sm)", fontSize: "0.74rem" }}>
              <span className="alert-body">
                The deployed API has no pipeline output for <strong>{city}</strong>
                {available && available.length > 0 && <> (it holds {available.join(", ")})</>},
                so a live run will fail here. Everything you are viewing is
                per-city and unaffected.
              </span>
            </p>
          )}
          {!hasBackend && (
            <p style={{ marginTop: "var(--space-sm)", fontSize: "0.74rem", color: "var(--text-tertiary)", lineHeight: 1.5 }}>
              No pipeline backend connected — this deployment reads precomputed
              batch output. The flow below is what runs offline.
            </p>
          )}
        </div>

        {/* The flow */}
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-md) var(--space-lg)" }}>
          {AGENT_ORDER.map((name, i) => {
            const st = stateOf(name);
            const s = STATUS[st];
            const dur = durOf(name);
            const last = i === AGENT_ORDER.length - 1;
            const Glyph = AGENT_ICONS[name];
            return (
              <div key={name} style={{ display: "flex", gap: 12 }}>
                {/* Rail: node + connector */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div
                    className={st === "running" ? "animate-breathe" : undefined}
                    style={{
                      width: 28, height: 28, borderRadius: "50%",
                      border: `1px solid ${s.ring}`,
                      background: st === "idle" ? "transparent" : `color-mix(in srgb, ${s.color} 12%, transparent)`,
                      color: s.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "border-color var(--transition-normal), background var(--transition-normal), color var(--transition-normal)",
                    }}
                  >
                    <Glyph {...icon.sm} aria-hidden />
                  </div>
                  {!last && (
                    <div style={{
                      width: 1, flex: 1, minHeight: 20, marginTop: 3, marginBottom: 3,
                      background: st === "done" ? "var(--positive-line)" : "var(--border-subtle)",
                      transition: "background var(--transition-normal)",
                    }} />
                  )}
                </div>

                {/* Content — tappable to run just this agent */}
                <button
                  onClick={() => onRun(name)}
                  disabled={running}
                  style={{
                    flex: 1, textAlign: "left", background: "transparent", border: "none",
                    fontFamily: "inherit",
                    cursor: running ? "default" : "pointer", padding: "1px 0 var(--space-md)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontWeight: 550, fontSize: "0.85rem", color: "var(--text-primary)" }}>
                      {AGENT_LABELS[name]}
                    </span>
                    <span
                      className="mono"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 3,
                        fontSize: "0.68rem", color: s.color, fontWeight: 500, whiteSpace: "nowrap",
                      }}
                    >
                      {st === "done" && dur ? (
                        <>
                          <Check {...icon.sm} aria-hidden />
                          {(dur / 1000).toFixed(1)}s
                        </>
                      ) : s.label}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.745rem", color: "var(--text-tertiary)", lineHeight: 1.45, marginTop: 2 }}>
                    {AGENT_DESCRIPTIONS[name]}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        <div style={{
          padding: "var(--space-md) var(--space-lg)", borderTop: "1px solid var(--border-subtle)",
          fontSize: "0.7rem", color: "var(--text-tertiary)", lineHeight: 1.5,
        }}>
          Deterministic agents rank; LLMs only explain. Heavy compute runs in batch —
          the map reads the precomputed result.
        </div>
      </aside>
    </>
  );
}
