"use client";

import { useMemo } from "react";
import type { ApexOptions } from "apexcharts";
import { CubaApexChart } from "@/components/dashboard/cuba-apex-chart";
import { AdminIcon } from "@/components/admin-icon";

export type HealthStatus = "healthy" | "degraded" | "down" | "unknown";

export interface DependencyHealth {
  key: string;
  name: string;
  group: string;
  status: HealthStatus;
  checked_at: string;
  last_success_at?: string;
  freshness_seconds?: number;
  error_class?: string;
  correlation_path?: string;
}

interface CubaHealthChartsProps {
  dependencies: DependencyHealth[];
  overallStatus: HealthStatus;
}

const groupLabels: Record<string, string> = {
  platform: "Platform",
  database: "Database",
  learning: "Pembelajaran",
  identity: "Identitas",
  search: "Pencarian",
  cache: "Cache",
  storage: "Penyimpanan",
  workers: "Worker",
  observability: "Observability",
};

export function CubaHealthCharts({ dependencies, overallStatus }: CubaHealthChartsProps) {
  const totalCount = dependencies.length;
  const healthyCount = dependencies.filter((d) => d.status === "healthy").length;
  const degradedCount = dependencies.filter((d) => d.status === "degraded").length;
  const downCount = dependencies.filter((d) => d.status === "down").length;

  // Calculate availability score (0 - 100)
  const availabilityScore = totalCount > 0 ? Math.round((healthyCount / totalCount) * 100) : 0;

  // Semantic color tokens: Emerald, Pure Yellow, Rose, Sky
  const colors = {
    healthy: "#10b981",
    degraded: "#eab308",
    down: "#f43f5e",
    sky: "#0ea5e9",
    slate: "#64748b",
  };

  // Score color based on availability tier
  const scoreColor =
    availabilityScore >= 90
      ? colors.healthy
      : availabilityScore >= 70
        ? colors.degraded
        : colors.down;

  // Score tier text
  const scoreTier =
    availabilityScore >= 90
      ? "Sistem Prima"
      : availabilityScore >= 70
        ? "Perhatian Diperlukan"
        : "Gangguan Kritis";

  // Group data aggregation for stacked bar chart
  const { groupCategories, healthyByGroup, degradedByGroup, downByGroup } = useMemo(() => {
    const groupMap = new Map<string, { healthy: number; degraded: number; down: number }>();

    for (const dep of dependencies) {
      const g = dep.group || "platform";
      const current = groupMap.get(g) || { healthy: 0, degraded: 0, down: 0 };
      if (dep.status === "healthy") current.healthy += 1;
      else if (dep.status === "degraded") current.degraded += 1;
      else if (dep.status === "down") current.down += 1;
      groupMap.set(g, current);
    }

    const categories: string[] = [];
    const healthy: number[] = [];
    const degraded: number[] = [];
    const down: number[] = [];

    groupMap.forEach((counts, grp) => {
      categories.push(groupLabels[grp] || grp);
      healthy.push(counts.healthy);
      degraded.push(counts.degraded);
      down.push(counts.down);
    });

    return {
      groupCategories: categories,
      healthyByGroup: healthy,
      degradedByGroup: degraded,
      downByGroup: down,
    };
  }, [dependencies]);

  // Chart 1: Cluster Status Distribution (Stacked Bar Chart)
  const clusterOptions: ApexOptions = useMemo(() => {
    return {
      chart: {
        type: "bar",
        height: 270,
        stacked: true,
        fontFamily: "Rubik, Inter, system-ui, sans-serif",
        toolbar: { show: false },
        animations: { enabled: true, speed: 450 },
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: "58%",
          borderRadius: 3,
        },
      },
      colors: [colors.healthy, colors.degraded, colors.down],
      series: [
        { name: "Sehat", data: healthyByGroup },
        { name: "Terdegradasi", data: degradedByGroup },
        { name: "Gangguan", data: downByGroup },
      ],
      xaxis: {
        categories: groupCategories,
        labels: {
          style: { fontSize: "11px", fontWeight: 600 },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        labels: {
          style: { fontSize: "11px", fontWeight: 700 },
        },
      },
      legend: {
        position: "top",
        horizontalAlign: "right",
        fontSize: "11px",
        fontWeight: 700,
        markers: { size: 5 },
      },
      grid: {
        strokeDashArray: 4,
        borderColor: "rgba(148, 163, 184, 0.18)",
      },
      dataLabels: {
        enabled: false,
      },
      tooltip: {
        shared: true,
        intersect: false,
        y: {
          formatter: (val) => `${val} layanan`,
        },
      },
    };
  }, [groupCategories, healthyByGroup, degradedByGroup, downByGroup, colors.healthy, colors.degraded, colors.down]);

  // Chart 2: Availability Score Semi-Gauge (RadialBar Chart)
  const radialOptions: ApexOptions = useMemo(() => {
    return {
      chart: {
        type: "radialBar",
        height: 260,
        fontFamily: "Rubik, Inter, system-ui, sans-serif",
        animations: { enabled: true, speed: 600 },
      },
      series: [availabilityScore],
      labels: ["Ketersediaan Sistem"],
      colors: [scoreColor],
      plotOptions: {
        radialBar: {
          startAngle: -135,
          endAngle: 135,
          hollow: {
            size: "68%",
            background: "transparent",
          },
          track: {
            background: "rgba(148, 163, 184, 0.15)",
            strokeWidth: "100%",
          },
          dataLabels: {
            name: {
              show: true,
              fontSize: "11px",
              fontWeight: 700,
              offsetY: 20,
              color: colors.slate,
            },
            value: {
              show: true,
              fontSize: "30px",
              fontWeight: 900,
              offsetY: -16,
              color: "inherit",
              formatter: (val: number) => `${val}%`,
            },
          },
        },
      },
      stroke: {
        lineCap: "round",
      },
      tooltip: {
        enabled: true,
        y: {
          formatter: (val: number) => `${val}% Layanan Aktif Sehat`,
        },
      },
    };
  }, [availabilityScore, scoreColor, colors.slate]);

  return (
    <div className="grid gap-5 lg:grid-cols-12" data-cuba-health-charts>
      {/* Chart 1: Distribusi Status per Kluster Dependensi */}
      <article className="cuba-card admin-card p-5 lg:col-span-8 flex flex-col justify-between" id="cluster-status-chart-card">
        <header className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
              Analisis Komparatif Kluster
            </span>
            <h2 className="mt-0.5 text-base font-black text-slate-900 dark:text-white">
              Distribusi Status per Kluster
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pemetaan status kesiapan dependensi pada setiap kluster infrastruktur platform.
            </p>
          </div>
          <div className="hidden items-center gap-2.5 text-xs font-bold sm:flex">
            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> {healthyCount} Sehat
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full bg-yellow-500" /> {degradedCount} Terdegradasi
            </span>
            {downCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> {downCount} Gangguan
              </span>
            )}
          </div>
        </header>

        <div className="mt-3">
          <CubaApexChart
            options={clusterOptions}
            height={270}
            ariaLabel="Grafik distribusi status per kluster dependensi"
          />
        </div>
      </article>

      {/* Chart 2: Indeks Reliabilitas & Ketersediaan SLA */}
      <article className="cuba-card admin-card p-5 lg:col-span-4 flex flex-col justify-between" id="reliability-score-chart-card">
        <header>
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
            Indeks Reliabilitas SLA
          </span>
          <h2 className="mt-0.5 text-base font-black text-slate-900 dark:text-white">
            Skor Ketersediaan Sistem
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Persentase layanan sehat terhadap total dependensi platform.
          </p>
        </header>

        <div className="my-1 flex justify-center">
          <CubaApexChart
            options={radialOptions}
            height={250}
            ariaLabel="Grafik skor ketersediaan sistem platform"
          />
        </div>

        {/* Ringkasan Metrik SLA */}
        <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Status Operasional</span>
            <span className="font-extrabold" style={{ color: scoreColor }}>
              {scoreTier}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Target Ketersediaan SLA</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">99.9%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Status Snapshot Probe</span>
            <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
              <AdminIcon name="check" className="h-3.5 w-3.5 text-emerald-500" />
              {overallStatus === "healthy" ? "Normal" : overallStatus === "degraded" ? "Terdegradasi" : "Perhatian"}
            </span>
          </div>
        </div>
      </article>
    </div>
  );
}
