"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const PASSIVE_COOLDOWN_MS = 5 * 60 * 1000;
const ACTIVE_COOLDOWN_MS = 5 * 1000;

export function SilentSsoBridge() {
  const router = useRouter();
  const [iframeActive, setIframeActive] = useState(false);
  const checkingRef = useRef(false);

  useEffect(() => {
    let checkTimeout: number;
    let fallbackTimeout: number;

    const runCheck = (isPassive: boolean) => {
      if (checkingRef.current) return;
      const lastCheckStr = sessionStorage.getItem("teman-belajar-sso-last-check") || "0";
      const lastCheck = parseInt(lastCheckStr, 10);
      const now = Date.now();
      
      const cooldown = isPassive ? PASSIVE_COOLDOWN_MS : ACTIVE_COOLDOWN_MS;
      if (now - lastCheck < cooldown) return;
      
      sessionStorage.setItem("teman-belajar-sso-last-check", String(now));
      checkingRef.current = true;
      setIframeActive(true);

      // Failsafe in case iframe fails to load or Keycloak is unreachable
      fallbackTimeout = window.setTimeout(() => {
        checkingRef.current = false;
        setIframeActive(false);
      }, 10000);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        runCheck(false);
      }
    };

    const onFocus = () => {
      runCheck(false);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "teman-belajar:sso-check-complete") {
        window.clearTimeout(fallbackTimeout);
        checkingRef.current = false;
        setIframeActive(false);
        router.refresh();
      }
    };

    window.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
    window.addEventListener("message", onMessage);

    // Initial passive check
    checkTimeout = window.setTimeout(() => runCheck(true), 0);

    return () => {
      window.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("message", onMessage);
      window.clearTimeout(checkTimeout);
      window.clearTimeout(fallbackTimeout);
    };
  }, [router]);

  if (!iframeActive) return null;

  return (
    <iframe
      src="/sso/check"
      title="Sinkronisasi sesi Teman Belajar"
      aria-hidden="true"
      className="pointer-events-none absolute h-0 w-0 border-0 opacity-0"
    />
  );
}
