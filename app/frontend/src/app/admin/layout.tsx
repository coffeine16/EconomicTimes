import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import CitySwitcher from "@/components/CitySwitcher";
import AdminNav from "@/components/AdminNav";
import { icon, Hexagon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "Admin Console — AirCase",
  description:
    "Interactive map dashboard with H3 hexagonal cells, hotspot detection, " +
    "source attribution, enforcement queue, and agent control.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
        background: "var(--bg-base)",
      }}
    >
      <header
        className="admin-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "var(--space-md)",
          padding: "0 var(--space-md)",
          height: 48,
          background: "var(--bg-primary)",
          borderBottom: "1px solid var(--border-subtle)",
          zIndex: "var(--z-header)",
          flexShrink: 0,
        }}
      >
        {/* The header's children are FLAT — logo, tabs, actions — because the
            mobile rules reorder them with `order` / `flex-basis`, which only
            apply to direct flex children. Do not wrap two of them in a div. */}
        <Link
          href="/"
          className="admin-logo"
          style={{
            display: "flex", alignItems: "center", gap: 7,
            textDecoration: "none", color: "var(--text-primary)", flexShrink: 0,
          }}
        >
          <Hexagon {...icon.md} style={{ color: "var(--accent)" }} aria-hidden />
          <span
            className="hide-mobile"
            style={{ fontWeight: 620, fontSize: "0.875rem", letterSpacing: "-0.015em" }}
          >
            AirCase
          </span>
        </Link>

        <AdminNav />

        <div
          className="admin-actions"
          style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
        >
          <CitySwitcher />
          <ThemeToggle />
        </div>
      </header>

      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {children}
      </div>
    </div>
  );
}
