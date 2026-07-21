"use client";
import Link from "next/link";
import { useReports } from "@/hooks/useReports";
import { REPORT_CATEGORY_LABELS, REPORT_CATEGORY_ICONS, REPORT_STATUS_LABELS, REPORT_STATUS_BADGE } from "@/lib/constants";
import { icon, ClipboardList, Info, TriangleAlert } from "@/components/Icon";
import type { CitizenReport } from "@/lib/types";

function ReportCard({ report }: { report: CitizenReport }) {
  const Glyph = REPORT_CATEGORY_ICONS[report.category];
  const badge = REPORT_STATUS_BADGE[report.status] ?? "badge-diffuse";
  return (
    <div
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}
    >
      {/* Top row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Glyph {...icon.md} aria-hidden style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
          <span style={{ fontWeight: 550, fontSize: "0.875rem", color: "var(--text-primary)" }}>
            {REPORT_CATEGORY_LABELS[report.category]}
          </span>
        </div>
        <span className={`badge ${badge}`}>
          {REPORT_STATUS_LABELS[report.status] ?? report.status}
        </span>
      </div>

      {/* Ward + date */}
      <div style={{ display: "flex", gap: "var(--space-md)", fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
        <span>{report.ward_name || report.ward_id}</span>
        <span>{new Date(report.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
      </div>

      {/* Description */}
      {report.description && (
        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>{report.description}</p>
      )}

      {/* Status message */}
      {report.status_message && (
        <div className="alert alert-positive">
          <Info {...icon.md} aria-hidden />
          <div className="alert-body">{report.status_message}</div>
        </div>
      )}

      {/* Photo thumbnail */}
      {report.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={report.photo_url}
          alt="Report photo"
          style={{ width: "100%", maxHeight: 160, objectFit: "cover", borderRadius: "var(--radius-sm)" }}
        />
      )}
    </div>
  );
}

export default function MyReportsPage() {
  const { reports, isLoading, error } = useReports();

  return (
    <div className="page" style={{ maxWidth: 680 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-md)", marginBottom: "var(--space-lg)" }}>
        <div>
          <h1 style={{ marginBottom: 3 }}>My reports</h1>
          <p style={{ fontSize: "0.85rem" }}>
            {reports.length} report{reports.length !== 1 ? "s" : ""} submitted
          </p>
        </div>
        <Link
          href="/citizen"
          className="btn btn-ghost btn-sm"
          style={{ textDecoration: "none", flexShrink: 0 }}
        >
          New report
        </Link>
      </div>

      {/* States */}
      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: "var(--radius-md)" }} />
          ))}
        </div>
      )}

      {error && !isLoading && (
        <div role="alert" className="alert alert-critical">
          <TriangleAlert {...icon.md} aria-hidden />
          <div className="alert-body">
            <strong>Could not load your reports</strong>
            The request failed. Check your connection and try again.
          </div>
        </div>
      )}

      {!isLoading && !error && reports.length === 0 && (
        <div className="empty">
          <ClipboardList {...icon.lg} aria-hidden />
          <h3>No reports yet</h3>
          <p>Help us detect pollution sources by submitting your first report.</p>
          <Link href="/citizen" className="btn btn-primary" style={{ textDecoration: "none", marginTop: 4 }}>
            Select my ward
          </Link>
        </div>
      )}

      {!isLoading && reports.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
          {reports.map((r) => (
            <ReportCard key={r.report_id} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}
