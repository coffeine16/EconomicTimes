"use client";
/**
 * CitySwitcher — the multi-city capability, made obvious. Switching moves the
 * whole app: every city-scoped hook re-reads from the new city's static bundle.
 */
import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { useCity, CITIES } from "@/lib/CityContext";
import { icon, Check, ChevronDown } from "@/components/Icon";

const EDGE = 8;   // px of breathing room we insist on at either viewport edge

export default function CitySwitcher() {
  const { city, cityLabel, setCity } = useCity();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  /**
   * Keep the menu inside the viewport.
   *
   * It is anchored `right: 0` — correct while the trigger sits at the right of a
   * desktop header. On a phone the header wraps and the trigger can end up near
   * the LEFT edge, at which point a 168px right-anchored menu renders from a
   * negative x and half of it is unreachable. (That is exactly what shipped.)
   *
   * So: place it, measure it, and flip the anchor if it overflowed. Written as a
   * direct style mutation rather than component state on purpose — this is
   * post-layout DOM measurement, so routing it through a re-render would paint
   * the wrong position for one frame before correcting it.
   */
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;

    const place = () => {
      el.style.right = "0";
      el.style.left = "auto";
      const r = el.getBoundingClientRect();
      if (r.left < EDGE) {
        // Overflows left → anchor from the trigger's left edge instead.
        el.style.right = "auto";
        el.style.left = "0";
        // Still too wide for the screen (very narrow phone): pin to the viewport.
        const r2 = el.getBoundingClientRect();
        if (r2.right > window.innerWidth - EDGE) {
          const overshoot = r2.right - (window.innerWidth - EDGE);
          el.style.left = `${-overshoot}px`;
        }
      }
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("orientationchange", place);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("orientationchange", place);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn btn-quiet btn-sm"
        style={{ fontWeight: 550, color: "var(--text-primary)" }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`City: ${cityLabel}. Change city`}
      >
        {cityLabel}
        <ChevronDown
          {...icon.sm}
          aria-hidden
          style={{
            opacity: 0.6,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform var(--transition-fast)",
          }}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="listbox"
          className="menu"
          style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0,
            minWidth: 168,
            // Never wider than the screen, whichever edge it ends up anchored to.
            maxWidth: `calc(100vw - ${EDGE * 2}px)`,
          }}
        >
          {CITIES.map((c) => (
            <button
              key={c.id}
              role="option"
              aria-selected={c.id === city}
              className="menu-item"
              onClick={() => { setCity(c.id); setOpen(false); }}
            >
              <span className="menu-mark">
                {c.id === city && <Check {...icon.sm} aria-hidden />}
              </span>
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
