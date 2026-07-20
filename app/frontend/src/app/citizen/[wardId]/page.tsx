"use client";
import { use, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import useSWR from "swr";
import { api } from "@/lib/api";
import { pm25ToAqi, getAqiCategory } from "@/lib/colors";
import { AQI_ADVICE } from "@/lib/constants";
import type { FusionResponse, ForecastCell } from "@/lib/types";

const CitizenMap = dynamic(() => import("@/components/citizen/CitizenMap"), {
  ssr: false,
  loading: () => <div className="skeleton" style={{ height: 300, borderRadius: "var(--radius-lg)" }} />,
});

interface Params { wardId: string }

export default function WardDashboardPage({ params }: { params: Promise<Params> }) {
  const { wardId } = use(params);

  const { data: summary, isLoading } = useSWR(
    ["ward-summary", wardId],
    () => api.getWardSummary(wardId)
  );
  const { data: fusion } = useSWR<FusionResponse>(["fusion", 0], () => api.getFusion(0));
  const cells = useMemo(() => fusion?.cells ?? [], [fusion]);

  // forecast for this ward: median predicted AQI across its cells, per horizon
  const { data: fc24 } = useSWR<ForecastCell[]>(["forecast", 24], () => api.getForecast(24));
  const { data: fc48 } = useSWR<ForecastCell[]>(["forecast", 48], () => api.getForecast(48));
  const { data: fc72 } = useSWR<ForecastCell[]>(["forecast", 72], () => api.getForecast(72));
  const wardCells = useMemo(() => new Set(cells.filter((c) => c.ward_id === wardId).map((c) => c.cell)), [cells, wardId]);
  const horizonAqi = (fc?: ForecastCell[]): number | null => {
    if (!fc) return null;
    const vals = fc.filter((f) => wardCells.has(f.cell)).map((f) => f.pm25_hat).sort((a, b) => a - b);
    if (!vals.length) return null;
    return pm25ToAqi(vals[Math.floor(vals.length / 2)]);
  };
  const forecast = [
    { label: "Now", aqi: summary ? pm25ToAqi(summary.pm25) : null },
    { label: "+24h", aqi: horizonAqi(fc24) },
    { label: "+48h", aqi: horizonAqi(fc48) },
    { label: "+72h", aqi: horizonAqi(fc72) },
  ];

  const aqi = summary ? pm25ToAqi(summary.pm25) : null;
  const category = aqi != null ? getAqiCategory(aqi) : null;
  const adviceIndex = aqi != null ? Math.min(Math.floor(aqi / 100), 5) : 0;

  return (
    <div style={{ padding: "var(--space-xl)", maxWidth: 680, margin: "0 auto", width: "100%" }}>
      {/* Back */}
      <Link
        href="/citizen"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          color: "var(--text-tertiary)", textDecoration: "none",
          fontSize: "0.8rem", marginBottom: "var(--space-lg)",
          transition: "color var(--transition-fast)",
        }}
      >
        ← Change ward
      </Link>

      {/* Ward name */}
      <div style={{ marginBottom: "var(--space-md)" }}>
        <h1 style={{ marginBottom: 4 }}>
          {isLoading ? (
            <span className="skeleton" style={{ display: "inline-block", width: 200, height: 32, borderRadius: 6 }} />
          ) : (
            summary?.ward_name ?? wardId
          )}
        </h1>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-tertiary)" }}>
          {wardId}
        </span>
      </div>

      {/* Map of THIS ward — leads the page: you land on your area */}
      <div style={{ marginBottom: "var(--space-lg)" }}>
        <CitizenMap cells={cells} highlightWard={wardId} interactive={false} height={280} />
        <p style={{ fontSize: "0.72rem", color: "var(--text-tertiary)", textAlign: "center", marginTop: 6 }}>
          Live PM2.5 across your ward — brighter cells are dirtier air.
        </p>
      </div>

      {/* AQI Card */}
      <div
        className="card"
        style={{
          marginBottom: "var(--space-lg)",
          borderColor: category ? category.color + "40" : undefined,
          background: category ? category.color + "08" : undefined,
        }}
      >
        {isLoading ? (
          <div className="skeleton" style={{ height: 120, borderRadius: 8 }} />
        ) : (
          <div style={{ display: "flex", gap: "var(--space-xl)", alignItems: "center" }}>
            {/* AQI dial */}
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div
                style={{
                  width: 100, height: 100, borderRadius: "50%",
                  background: category?.color ?? "#666",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  boxShadow: `0 0 30px ${category?.color ?? "#666"}40`,
                }}
              >
                <div style={{ fontSize: "1.8rem", fontWeight: 700, color: category?.textColor ?? "#fff", lineHeight: 1 }}>
                  {aqi ?? "—"}
                </div>
                <div style={{ fontSize: "0.6rem", color: category?.textColor ?? "#fff", opacity: 0.85, marginTop: 2 }}>
                  AQI
                </div>
              </div>
            </div>
            {/* Details */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: 4 }}>
                {category?.label ?? "No data"}
              </div>
              <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: 8 }}>
                PM2.5: <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                  {summary?.pm25 != null ? `${summary.pm25.toFixed(1)} µg/m³` : "—"}
                </span>
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {AQI_ADVICE[adviceIndex]}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Advisory */}
      {summary?.advisory && (
        <div
          className="card"
          style={{
            marginBottom: "var(--space-lg)",
            borderColor: "rgba(245,158,11,0.3)",
            background: "rgba(245,158,11,0.05)",
          }}
        >
          <h5 style={{ marginBottom: 8, color: "var(--accent-amber)" }}>📢 Advisory</h5>
          <p style={{ fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: 1.6 }}>
            {summary.advisory}
          </p>
        </div>
      )}

      {/* 72-hour forecast — median predicted AQI across the ward's cells */}
      <div className="card" style={{ marginBottom: "var(--space-lg)" }}>
        <h5 style={{ marginBottom: "var(--space-md)" }}>72-Hour Forecast</h5>
        <div style={{ display: "flex", gap: "var(--space-sm)" }}>
          {forecast.map((f) => {
            const cat = f.aqi != null ? getAqiCategory(f.aqi) : null;
            return (
              <div
                key={f.label}
                style={{
                  flex: 1, textAlign: "center", padding: "var(--space-md) 4px",
                  borderRadius: "var(--radius-md)",
                  background: cat ? cat.color + "12" : "var(--bg-secondary)",
                  border: `1px solid ${cat ? cat.color + "30" : "var(--border-subtle)"}`,
                }}
              >
                <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)", marginBottom: 6 }}>{f.label}</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: cat?.color ?? "var(--text-tertiary)", lineHeight: 1 }}>
                  {f.aqi ?? "—"}
                </div>
                <div style={{ fontSize: "0.62rem", color: "var(--text-tertiary)", marginTop: 4 }}>{cat?.label ?? ""}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "var(--space-md)", flexWrap: "wrap" }}>
        <Link
          href={`/citizen/${wardId}/report`}
          className="btn btn-primary"
          style={{ flex: 1, justifyContent: "center", textDecoration: "none" }}
        >
          📸 Report Pollution
        </Link>
        <Link
          href="/citizen/reports"
          className="btn btn-ghost"
          style={{ flex: 1, justifyContent: "center", textDecoration: "none" }}
        >
          📋 My Reports
        </Link>
      </div>
    </div>
  );
}
