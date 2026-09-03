"use client";

import { useEffect, useState } from "react";

import { PortalIcon } from "@/components/portal-icon";

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

    const animationFrame = window.requestAnimationFrame(() => {
      setTheme(readTheme());
      setMounted(true);
    });
    media.addEventListener("change", syncFromSystem);
    window.addEventListener("storage", syncFromStorage);
    return () => {
      window.cancelAnimationFrame(animationFrame);
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
        <PortalIcon name={isDark ? "sun" : "moon"} />
      </span>
      <span className="portal-theme-toggle__label">{mounted ? (isDark ? "Terang" : "Gelap") : "Tema"}</span>
    </button>
  );
}
