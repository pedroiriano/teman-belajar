"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import type { ApexOptions } from "apexcharts";

interface CubaApexChartProps {
  options: ApexOptions;
  height?: number | string;
  className?: string;
  ariaLabel?: string;
}

const emptySubscribe = () => () => {};

export function CubaApexChart({
  options,
  height = 280,
  className = "",
  ariaLabel = "Grafik analitik operasional",
}: CubaApexChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ApexCharts | null>(null);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  useEffect(() => {
    if (!mounted || !containerRef.current) return;

    let isDestroyed = false;

    import("apexcharts").then(({ default: ApexCharts }) => {
      if (isDestroyed || !containerRef.current) return;

      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }

      // Detect dark theme
      const isDark = document.documentElement.dataset.theme === "dark";
      const mergedOptions: ApexOptions = {
        ...options,
        chart: {
          ...options.chart,
          height,
          background: "transparent",
          toolbar: { show: false },
          animations: { enabled: true, speed: 400 },
        },
        theme: {
          mode: isDark ? "dark" : "light",
        },
      };

      const chart = new ApexCharts(containerRef.current, mergedOptions);
      chartRef.current = chart;
      chart.render().catch(() => {});
    });

    // Theme mutation observer to update chart theme seamlessly
    const observer = new MutationObserver(() => {
      if (!chartRef.current) return;
      const isDark = document.documentElement.dataset.theme === "dark";
      chartRef.current.updateOptions(
        {
          theme: { mode: isDark ? "dark" : "light" },
          chart: { background: "transparent" },
        },
        false,
        false
      );
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      isDestroyed = true;
      observer.disconnect();
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [mounted, options, height]);

  return (
    <div
      ref={containerRef}
      className={`apex-host ${className}`}
      role="img"
      aria-label={ariaLabel}
      style={{ minHeight: typeof height === "number" ? `${height}px` : height }}
    >
      {!mounted && (
        <div className="flex h-full min-h-[200px] items-center justify-center text-xs text-slate-400">
          Memuat visualisasi...
        </div>
      )}
    </div>
  );
}
