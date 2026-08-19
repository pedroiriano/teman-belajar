"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const retryAfterMs = 5 * 60 * 1000;

export function SilentSsoBridge() {
  const router = useRouter();
  const loadCount = useRef(0);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const previous = Number(sessionStorage.getItem("teman-belajar-sso-check") || 0);
    if (Date.now() - previous < retryAfterMs) return;
    sessionStorage.setItem("teman-belajar-sso-check", String(Date.now()));
    const enable = window.setTimeout(() => setEnabled(true), 0);
    return () => window.clearTimeout(enable);
  }, []);

  if (!enabled) return null;
  return (
    <iframe
      src="/sso/check"
      title="Sinkronisasi sesi Teman Belajar"
      aria-hidden="true"
      className="pointer-events-none absolute h-0 w-0 border-0 opacity-0"
      onLoad={() => {
        loadCount.current += 1;
        if (loadCount.current < 2) return;
        setEnabled(false);
        router.refresh();
      }}
    />
  );
}
