"use client";
/**
 * Repeat Offender Registry — entities attributed repeatedly are escalated:
 * advisory → memo → chronic-offender flag.
 *
 * Data: derived client-side from attributions.json by clustering on primary_source
 * + ward. The backend registry endpoint (/registry) is not yet built.
 * Falls back to showing what we can compute from attribution data.
 */
import useSWR from "swr";
import { useCity } from "@/lib/CityContext";
import { api } from "@/lib/api";
import type { Attribution } from "@/lib/types";
import { SOURCE_LABELS } from "@/lib/constants";
import { SOURCE_COLORS } from "@/lib/colors";
import { icon, FolderOpen } from "@/components/Icon";

// Cluster attribution rows by (ward_id + primary_source) as a stand-in for
// a proper entity registry (which needs the repeat-offender agent to be built).
interface OffenderCluster {
  key: string;
  ward_id: string;
  source: string;
  count: number;
  max_confidence: number;
  tier: "advisory" | "memo" | "chronic";
  last_seen: string;
}

function buildClusters(attributions: Attribution[]): OffenderCluster[] {
  const map = new Map<string, OffenderCluster>();
  for (const a of attributions) {
    const key = `${a.ward_id}__${a.primary_source}`;
    const ex = map.get(key);
    if (!ex) {
      map.set(key, {
        key, ward_id: a.ward_id,
        source: a.primary_source,
        count: 1,
        max_confidence: a.confidence,
        tier: "advisory",
        last_seen: a.ts,
      });
    } else {
      ex.count += 1;
      if (a.confidence > ex.max_confidence) ex.max_confidence = a.confidence;
      if (a.ts > ex.last_seen) ex.last_seen = a.ts;
      ex.tier = ex.count >= 5 ? "chronic" : ex.count >= 3 ? "memo" : "advisory";
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

// Escalation is an ORDERED scale — advisory → memo → chronic — so the three
// tiers get the three semantic tokens in increasing severity, and nothing else.
// (Previously blue/amber/red raw hexes plus 📋/⚠️/🚨, three emoji at three
// different optical weights.)
const TIER_CONFIG: Record<string, { label: string; tint: string; badge: string; range: string }> = {
  advisory: { label: "Advisory",         tint: "var(--accent)",   badge: "badge-accent",   range: "1–2×" },
  memo:     { label: "Enforcement memo", tint: "var(--caution)",  badge: "badge-caution",  range: "3–4×" },
  chronic:  { label: "Chronic offender", tint: "var(--critical)", badge: "badge-critical", range: "5+×" },
};

function OffenderCard({ cluster }: { cluster: OffenderCluster }) {
  const tier = TIER_CONFIG[cluster.tier];
  const sourceColor = (SOURCE_COLORS as Record<string, string>)[cluster.source] ?? "var(--text-tertiary)";
  return (
    <div
      className="card card-rail card-hover"
      style={{
        ["--rail" as string]: tier.tint,
        display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: "var(--space-md)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
          <span
            aria-hidden
            style={{ width: 7, height: 7, borderRadius: 2, background: sourceColor, flexShrink: 0 }}
          />
          <span style={{ fontWeight: 550, fontSize: "0.875rem", color: "var(--text-primary)" }}>
            {SOURCE_LABELS[cluster.source as keyof typeof SOURCE_LABELS] ?? cluster.source}
          </span>
          <span className={`badge ${tier.badge}`}>{tier.label}</span>
        </div>
        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
          Ward {cluster.ward_id}
        </div>
        <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)", marginTop: 2 }}>
          Last attributed {new Date(cluster.last_seen).toLocaleDateString("en-IN")}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-lg)", flexShrink: 0 }}>
        <div style={{ textAlign: "right" }}>
          <div className="mono" style={{ fontSize: "1.4rem", fontWeight: 600, lineHeight: 1, color: "var(--text-primary)" }}>
            {cluster.count}
          </div>
          <div className="section-label" style={{ fontSize: "0.62rem", marginTop: 3 }}>attributions</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="mono" style={{ fontSize: "0.95rem", fontWeight: 500, lineHeight: 1, color: "var(--text-secondary)" }}>
            {cluster.max_confidence.toFixed(2)}
          </div>
          <div className="section-label" style={{ fontSize: "0.62rem", marginTop: 3 }}>max conf</div>
        </div>
      </div>
    </div>
  );
}

export default function RegistryPage() {
  const { city } = useCity();
  const { data: attributions, isLoading } = useSWR<Attribution[]>(
    [city, "attributions"],
    () => api.cityAttributions(city)
  );

  const clusters = attributions ? buildClusters(attributions) : [];
  const chronic = clusters.filter((c) => c.tier === "chronic");
  const memoTier = clusters.filter((c) => c.tier === "memo");
  const advisory = clusters.filter((c) => c.tier === "advisory");

  return (
    <div className="page" style={{ maxWidth: 900, overflowY: "auto", height: "100%" }}>
      <div className="page-head">
        <h1>Repeat offender registry</h1>
        <p>
          Entities attributed repeatedly are escalated through tiers. The accumulated
          case file — every past attribution and evidence chain — is ready for closure
          proceedings.
        </p>
        <div className="note" style={{ ["--rail" as string]: "var(--caution)", marginTop: "var(--space-md)" }}>
          Currently derived client-side from attribution history. The backend
          repeat-offender agent (clustering by source location across weeks) is not
          yet built. Attribution count ≥ 3 = memo tier; ≥ 5 = chronic offender flag.
        </div>
      </div>

      {/* Escalation scale */}
      <div style={{ display: "flex", gap: "var(--space-sm)", marginBottom: "var(--space-xl)", flexWrap: "wrap" }}>
        {Object.entries(TIER_CONFIG).map(([key, { label, badge, range }]) => (
          <span key={key} className={`badge ${badge}`} style={{ padding: "4px 9px" }}>
            {label}
            <span style={{ color: "var(--text-tertiary)", fontWeight: 450 }}>{range}</span>
          </span>
        ))}
      </div>

      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          {[1,2,3].map((i) => <div key={i} className="skeleton" style={{ height: 88, borderRadius: "var(--radius-md)" }} />)}
        </div>
      ) : clusters.length === 0 ? (
        <div className="empty">
          <FolderOpen {...icon.lg} aria-hidden />
          <h3>No attributions yet</h3>
          <p>Run the attribution agent to populate the registry.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-xl)" }}>
          {chronic.length > 0 && (
            <div>
              <h3 style={{ marginBottom: "var(--space-md)" }}>
                Chronic offenders <span className="mono" style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>{chronic.length}</span>
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                {chronic.map((c) => <OffenderCard key={c.key} cluster={c} />)}
              </div>
            </div>
          )}
          {memoTier.length > 0 && (
            <div>
              <h3 style={{ marginBottom: "var(--space-md)" }}>
                Enforcement memo tier <span className="mono" style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>{memoTier.length}</span>
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                {memoTier.map((c) => <OffenderCard key={c.key} cluster={c} />)}
              </div>
            </div>
          )}
          {advisory.length > 0 && (
            <div>
              <h3 style={{ marginBottom: "var(--space-md)" }}>
                Advisory tier <span className="mono" style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>{advisory.length}</span>
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
                {advisory.map((c) => <OffenderCard key={c.key} cluster={c} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
