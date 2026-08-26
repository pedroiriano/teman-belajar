"use client";

import { useEffect, useState } from "react";

const interactiveGroups = ".portal-nav-group[open], .portal-mobile-group[open]";

function closeNavigationGroups(except?: HTMLDetailsElement | null) {
  document.querySelectorAll<HTMLDetailsElement>(interactiveGroups).forEach((group) => {
    if (group !== except) group.removeAttribute("open");
  });
}

/** React-safe adapter for Techwind app.js navigation, sticky header, and back-to-top behavior. */
export function useTechwindRuntime(routeKey: string) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [navSticky, setNavSticky] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setMenuOpen(false);
      closeNavigationGroups();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [routeKey]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      closeNavigationGroups();
    };
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const group = target.closest<HTMLDetailsElement>(".portal-nav-group, .portal-mobile-group");
      if (!group) closeNavigationGroups();
      else if (target.closest("summary")?.parentElement === group && !group.hasAttribute("open")) closeNavigationGroups(group);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("click", onDocumentClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("click", onDocumentClick);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setNavSticky(window.scrollY >= 50);
      setShowBackToTop(window.scrollY > 500);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return {
    menuOpen,
    navSticky,
    showBackToTop,
    toggleMenu: () => setMenuOpen((value) => !value),
    closeMenu: () => setMenuOpen(false),
    scrollToTop: () => window.scrollTo({ top: 0, behavior: "smooth" }),
  };
}
