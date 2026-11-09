"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";

const key = "faubourg-theme";

export function ThemeToggle() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      let saved;
      try {
        saved = localStorage.getItem(key);
      } catch {}
      document.documentElement.dataset.theme =
        saved === "dark" || saved === "light"
          ? saved
          : media.matches
            ? "dark"
            : "light";
    };
    const storage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) sync();
    };
    media.addEventListener("change", sync);
    window.addEventListener("storage", storage);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", storage);
    };
  }, []);

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => {
        const theme =
          document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = theme;
        try {
          localStorage.setItem(key, theme);
        } catch {}
      }}
    >
      <span className="theme-to-dark">
        <Moon size={19} aria-hidden="true" />
        <span className="sr-only">Activer le mode sombre</span>
      </span>
      <span className="theme-to-light">
        <Sun size={19} aria-hidden="true" />
        <span className="sr-only">Activer le mode clair</span>
      </span>
    </button>
  );
}
