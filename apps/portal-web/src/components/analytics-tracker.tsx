"use client";

import { useEffect, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function TrackerLogic() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trackedPath = useRef<string>("");
  const trackedQuery = useRef<string | null>(null);

  useEffect(() => {
    const q = searchParams.get("q");

    if (pathname !== trackedPath.current) {
      trackedPath.current = pathname;
      fetch("/api/analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "portal.page_view",
          url: window.location.pathname,
          referrer: document.referrer || "",
          metadata: {}
        }),
      }).catch(console.error);
    }

    if (pathname === "/search" && q && q !== trackedQuery.current) {
      trackedQuery.current = q;
      fetch("/api/analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "search.executed",
          url: window.location.pathname,
          referrer: document.referrer || "",
          metadata: { query: q }
        }),
      }).catch(console.error);
    }

  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsTracker() {
  return (
    <Suspense fallback={null}>
      <TrackerLogic />
    </Suspense>
  );
}

