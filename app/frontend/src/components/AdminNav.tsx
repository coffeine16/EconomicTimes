"use client";
/**
 * AdminNav — the console's wordmark + section tabs.
 *
 * Split out of admin/layout.tsx (a server component) so it can read the
 * pathname. The tabs previously had NO active state: six identical grey links,
 * so the header told you nothing about where you were. That is a navigation
 * hierarchy failure, not a styling nit — it is the single most useful piece of
 * information a persistent header can carry.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { icon, Hexagon } from "@/components/Icon";

const TABS = [
  { href: "/admin",            label: "Map" },
  { href: "/admin/compare",    label: "Cities" },
  { href: "/admin/validation", label: "Validation" },
  { href: "/admin/ledger",     label: "Ledger" },
  { href: "/admin/registry",   label: "Registry" },
  { href: "/admin/audit",      label: "Audit" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-md)", minWidth: 0 }}>
      <Link
        href="/"
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

      <nav
        className="scroll-x admin-nav"
        aria-label="Console sections"
        style={{ display: "flex", gap: 2, minWidth: 0 }}
      >
        {TABS.map(({ href, label }) => {
          // /admin must match exactly; the rest match their subtree.
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="nav-link"
              data-active={active}
              aria-current={active ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
