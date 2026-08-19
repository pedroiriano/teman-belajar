"use client";

import { useEffect, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function TrackerLogic() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const trackedPath = useRef<string>("");

  useEffect(() => {
    if (pathname !== trackedPath.current) {
      trackedPath.current = pathname;
      fetch("/api/analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "admin.page_view",
          url: "[Admin] " + window.location.pathname,
          referrer: document.referrer || "",
          metadata: {}
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
