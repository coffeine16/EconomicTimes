"use client";
/**
 * AdminNav — the console's section tabs. Tabs ONLY.
 *
 * The wordmark deliberately lives in admin/layout.tsx rather than here, even
 * though they render next to each other. The mobile header is a wrapping flex
 * row that orders its children logo → actions → nav (tabs drop to their own
 * full-width scrollable line), and `order`/`flex-basis` only apply to DIRECT
 * flex children. Wrapping the logo and the tabs in one div made those rules
 * apply inside the wrapper instead of inside the header, so the tabs sat beside
 * the logo and the city switcher was pushed to the left edge of the row below —
 * where its right-anchored dropdown then opened off-screen.
 *
 * Keep the header's children flat.
 *
 * These tabs previously had NO active state: six identical grey links, so the
 * header could not tell you where you were.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  );
}
