"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "teman-belajar-theme";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function readTheme(): Theme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncFromRoot = () => setTheme(readTheme());
    const syncFromSystem = () => {
      if (!window.localStorage.getItem(STORAGE_KEY)) {
        const nextTheme: Theme = media.matches ? "dark" : "light";
        applyTheme(nextTheme);
        setTheme(nextTheme);
      }
    };
    const syncFromStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const nextTheme: Theme = event.newValue === "dark" ? "dark" : event.newValue === "light" ? "light" : media.matches ? "dark" : "light";
      applyTheme(nextTheme);
      setTheme(nextTheme);
    };

    syncFromRoot();
    setMounted(true);
    media.addEventListener("change", syncFromSystem);
    window.addEventListener("storage", syncFromStorage);
    return () => {
      media.removeEventListener("change", syncFromSystem);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  const isDark = theme === "dark";
  const toggleTheme = () => {
    const nextTheme: Theme = isDark ? "light" : "dark";
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
    setTheme(nextTheme);
  };

  return (
    <button
      type="button"
      className="portal-theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? "Aktifkan tema terang" : "Aktifkan tema gelap"}
      aria-pressed={isDark}
      title={isDark ? "Gunakan tema terang" : "Gunakan tema gelap"}
    >
      <span className="portal-theme-toggle__icon" aria-hidden="true">
        {isDark ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.4 15.6A8.5 8.5 0 0 1 8.4 3.6 8.5 8.5 0 1 0 20.4 15.6Z"/></svg>
        )}
      </span>
      <span className="portal-theme-toggle__label">{mounted ? (isDark ? "Terang" : "Gelap") : "Tema"}</span>
    </button>
  );
}
