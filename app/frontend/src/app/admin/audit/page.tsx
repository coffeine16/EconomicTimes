"use client";
/**
 * Network Audit — two panels:
 * 1. Monitoring Blind Spots: cells where satellite says "high" but no monitor exists → next-sensor placement
 * 2. Sensor Anomaly Flags: stations reading flat while satellite spikes → malfunction/tampering review
 */
import useSWR from "swr";
import { useCity } from "@/lib/CityContext";
import { api } from "@/lib/api";
import { BLINDSPOT_HEX } from "@/lib/colors";
import { icon, RadioTower, ShieldAlert, CircleCheck } from "@/components/Icon";
import type { AuditResponse, BlindSpot, SensorFlag } from "@/lib/types";

function BlindSpotsTable({ spots }: { spots: BlindSpot[] }) {
  if (!spots.length) {
    return (
      <div className="empty" style={{ border: "none" }}>
        <RadioTower {...icon.lg} aria-hidden />
        <p>No blind spots detected — or the audit agent has not run yet.</p>
      </div>
    );
  }
  return (
    <div className="scroll-x">
      <table className="data-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Cell</th>
            <th>Ward</th>
            <th>Satellite signal</th>
          </tr>
        </thead>
        <tbody>
          {spots.slice(0, 20).map((s) => (
            <tr key={s.cell}>
              <td className="mono" style={{ color: "var(--text-primary)", fontWeight: 550 }}>
                {s.rank}
              </td>
              <td className="mono" style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                {s.cell.slice(0, 12)}…
              </td>
              <td>{s.ward_id}</td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* A bar whose width was the value and whose CONTAINER was
                      absent — so a 0.2 and a 0.9 were both just "a yellow bar
                      of some length" with nothing to read them against. */}
                  <div className="meter" style={{ maxWidth: 110, ["--tint" as string]: BLINDSPOT_HEX }}>
                    <i style={{ width: `${Math.min(100, s.satellite_signal * 100).toFixed(0)}%` }} />
                  </div>
                  <span className="mono" style={{ fontSize: "0.75rem" }}>
                    {s.satellite_signal.toFixed(3)}
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {spots.length > 20 && (
        <div style={{ padding: "9px 14px", fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
          Showing the top 20 of {spots.length} blind spots
        </div>
      )}
    </div>
  );
}

function SensorFlagCard({ flag }: { flag: SensorFlag }) {
  const isTampering = flag.reason === "flat_while_satellite_spikes";
  return (
    <div
      className="card card-rail"
      style={{
        ["--rail" as string]: isTampering ? "var(--critical)" : "var(--border-strong)",
        display: "flex", alignItems: "flex-start", gap: 12,
      }}
    >
      <ShieldAlert
        {...icon.md}
        aria-hidden
        style={{ color: isTampering ? "var(--critical)" : "var(--text-tertiary)", flexShrink: 0, marginTop: 2 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 550, marginBottom: 4, fontSize: "0.875rem", color: "var(--text-primary)" }}>
          {flag.station_name}
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 4 }}>
          {isTampering
            ? "Reads flat while the satellite column spikes overhead — possible malfunction or tampering."
            : "No data in the expected window."}
        </div>
        <div className="mono" style={{ fontSize: "0.72rem", color: "var(--text-tertiary)" }}>
          {flag.ward_id} · {flag.cell.slice(0, 12)}…
        </div>
      </div>
      <span className={`badge ${isTampering ? "badge-critical" : "badge-diffuse"}`}>
        {isTampering ? "Anomaly" : "No data"}
      </span>
    </div>
  );
}

/** Section heading with a count, used by both columns. */
function Head({ title, count, tone, blurb }: {
  title: string; count: number; tone: "caution" | "critical"; blurb: string;
}) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <h2>{title}</h2>
        {count > 0 && <span className={`badge badge-${tone}`}>{count}</span>}
      </div>
      <p style={{ fontSize: "0.85rem", marginBottom: "var(--space-md)" }}>{blurb}</p>
    </>
  );
}

export default function AuditPage() {
  const { city } = useCity();
  const { data, isLoading } = useSWR<AuditResponse>(
    [city, "audit"],
    () => api.cityAudit(city)
  );

  const blindSpots = data?.blind_spots ?? [];
  const sensorFlags = data?.sensor_flags ?? [];
  const recommendations = data?.placement_recommendations ?? [];

  return (
    <div className="page" style={{ maxWidth: 1120, overflowY: "auto", height: "100%" }}>
      <div className="page-head">
        <h1>Monitoring network audit</h1>
        <p>
          Free byproducts of the fusion field. Cells where satellite and fusion both
          say <strong>high</strong> but no monitor exists become next-sensor placement
          candidates. Stations that read flat while the satellite spikes overhead go
          for malfunction or tampering review. A direct answer to the 2024 CAG audit.
        </p>
      </div>

      <div className="grid-auto" style={{ ["--min" as string]: "430px", gap: "var(--space-xl)", alignItems: "start" }}>
        {/* Blind spots */}
        <section>
          <Head
            title="Monitoring blind spots"
            count={blindSpots.length}
            tone="caution"
            blurb="Ranked by satellite signal strength. The top entries are the optimal next-sensor placement candidates."
          />
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            {isLoading
              ? <div className="skeleton" style={{ height: 220 }} />
              : <BlindSpotsTable spots={blindSpots} />}
          </div>

          {recommendations.length > 0 && (
            <div style={{ marginTop: "var(--space-lg)" }}>
              <h4 style={{ marginBottom: "var(--space-sm)" }}>Placement recommendations</h4>
              <ol style={{ display: "flex", flexDirection: "column", gap: 6, listStyle: "none" }}>
                {recommendations.map((r: string, i: number) => (
                  <li
                    key={i}
                    className="card"
                    style={{
                      display: "flex", alignItems: "flex-start", gap: 10,
                      fontSize: "0.83rem", lineHeight: 1.55, color: "var(--text-secondary)",
                      padding: "10px 12px",
                    }}
                  >
                    <span className="mono" style={{ color: "var(--text-tertiary)", flexShrink: 0 }}>
                      {i + 1}
                    </span>
                    {r}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>

        {/* Sensor anomaly flags */}
        <section>
          <Head
            title="Sensor anomaly flags"
            count={sensorFlags.length}
            tone="critical"
            blurb="Stations reading flat while the satellite spikes overhead. Possible malfunction or tampering — flagged for physical review."
          />
          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
              {[1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 84 }} />)}
            </div>
          ) : sensorFlags.length === 0 ? (
            <div className="empty">
              <CircleCheck {...icon.lg} aria-hidden style={{ color: "var(--positive)", opacity: 0.8 }} />
              <p>No anomalies detected — every station is reporting normally.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
              {sensorFlags.map((f) => <SensorFlagCard key={f.cell} flag={f} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
