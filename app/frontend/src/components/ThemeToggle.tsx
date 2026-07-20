"use client";
/**
 * ThemeToggle — flips the app between dark and light, persists the choice, and
 * keeps <html data-theme> in sync. The initial value is applied before paint by
 * the inline script in layout.tsx; this just mirrors and mutates it.
 */
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const current = (document.documentElement.getAttribute("data-theme") as "dark" | "light") || "dark";
    setTheme(current);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("aq-theme", next); } catch { /* ignore */ }
  };

  return (
    <button
      onClick={toggle}
      className="btn btn-ghost btn-icon"
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      aria-label="Toggle colour theme"
      style={{ fontSize: "1rem" }}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
