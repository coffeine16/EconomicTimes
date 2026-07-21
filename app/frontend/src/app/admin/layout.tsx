import type { Metadata } from "next";
import ThemeToggle from "@/components/ThemeToggle";
import CitySwitcher from "@/components/CitySwitcher";
import AdminNav from "@/components/AdminNav";

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
