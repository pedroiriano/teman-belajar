"use client";

import { useEffect, type RefObject } from "react";

const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** React-safe adapter for Cuba sidebar/menu behavior; replaces global DOM initializers. */
export function useCubaDrawerRuntime({ open, drawerRef, openerRef, onClose }: { open: boolean; drawerRef: RefObject<HTMLElement | null>; openerRef: RefObject<HTMLButtonElement | null>; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const opener = openerRef.current;
    const drawer = drawerRef.current;
    const focusable = () => Array.from(drawer?.querySelectorAll<HTMLElement>(focusableSelector) ?? []).filter((element) => element.getClientRects().length > 0);
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => focusable()[0]?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) {
        event.preventDefault();
        drawer?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [drawerRef, onClose, open, openerRef]);
}

export function useCubaDisclosureRuntime() {
  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const details = document.querySelector<HTMLDetailsElement>("details.admin-profile-dropdown");
      if (details?.open && !details.contains(event.target as Node)) details.removeAttribute("open");
    };
    document.addEventListener("click", onDocumentClick);
    return () => document.removeEventListener("click", onDocumentClick);
  }, []);
}
