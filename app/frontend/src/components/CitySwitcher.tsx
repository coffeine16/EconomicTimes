"use client";
/**
 * CitySwitcher — the multi-city capability, made obvious. Switching moves the
 * whole app: every city-scoped hook re-reads from the new city's static bundle.
 */
import { useState, useRef, useEffect } from "react";
import { useCity, CITIES } from "@/lib/CityContext";
import { icon, Check, ChevronDown } from "@/components/Icon";

export default function CitySwitcher() {
  const { city, cityLabel, setCity } = useCity();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

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
          role="listbox"
          className="menu"
          style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: 168 }}
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
