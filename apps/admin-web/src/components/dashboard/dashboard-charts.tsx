"use client";

import { useMemo, useState } from "react";
import type { ApexOptions } from "apexcharts";
import { CubaApexChart } from "@/components/dashboard/cuba-apex-chart";
import type { ContentBreakdown, DashboardKPI } from "@/types/dashboard";

interface DashboardChartsProps {
  kpi: DashboardKPI;
  breakdown: ContentBreakdown;
}

export function DashboardCharts({ kpi, breakdown }: DashboardChartsProps) {
  const [rangeDays, setRangeDays] = useState<"7" | "14" | "30">("7");
  const [viewMode, setViewMode] = useState<"trend" | "modules">("trend");

  const colors = {
    primary: "#0ea5e9",
    cyan: "#06b6d4",
    success: "#10b981",
    warning: "#eab308",
    slate: "#64748b",
  };

  // Activity Area Chart Configuration
  const activityOptions: ApexOptions = useMemo(() => {
    const categories =
      rangeDays === "7"
        ? ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]
        : rangeDays === "14"
          ? ["M1-1", "M1-2", "M1-3", "M1-4", "M1-5", "M1-6", "M1-7", "M2-1", "M2-2", "M2-3", "M2-4", "M2-5", "M2-6", "M2-7"]
          : ["W1", "W2", "W3", "W4"];

    // Proportional data based on current KPI metrics
    const factor = rangeDays === "7" ? 1 : rangeDays === "14" ? 1.8 : 3.5;
    const basePublished = Math.max(1, Math.round(kpi.total_published / (10 / factor)));
    const baseReview = Math.max(1, Math.round(kpi.pending_review / (3 / factor)));
    const baseDraft = Math.max(1, Math.round(kpi.total_draft / (5 / factor)));

    const createdData = categories.map((_, i) => Math.round(baseDraft * (0.8 + (i % 4) * 0.25)));
    const reviewedData = categories.map((_, i) => Math.round(baseReview * (0.7 + ((i + 1) % 3) * 0.3)));
    const publishedData = categories.map((_, i) => Math.round(basePublished * (0.6 + ((i + 2) % 4) * 0.2)));

    return {
      chart: {
        type: "area",
        height: 278,
        fontFamily: "Rubik, Inter, system-ui, sans-serif",
        toolbar: { show: false },
      },
      colors: [colors.primary, colors.cyan, colors.success],
      series: [
        { name: "Dibuat", data: createdData },
        { name: "Ditinjau", data: reviewedData },
        { name: "Terbit", data: publishedData },
      ],
      stroke: { curve: "smooth", width: 2.5 },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 0.5,
          opacityFrom: 0.3,
          opacityTo: 0.04,
          stops: [0, 85, 100],
        },
      },
      markers: { size: 0, hover: { size: 5 } },
      dataLabels: { enabled: false },
      legend: { show: false },
      grid: {
        strokeDashArray: 4,
        borderColor: "rgba(148, 163, 184, 0.2)",
      },
      xaxis: {
        categories,
        labels: { style: { fontSize: "11px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        min: 0,
        tickAmount: 4,
        labels: { style: { fontSize: "11px" } },
      },
      tooltip: { shared: true },
    };
  }, [rangeDays, kpi, colors.primary, colors.cyan, colors.success]);

  // Module Comparison Bar Chart Configuration
  const moduleOptions: ApexOptions = useMemo(() => {
    const categories = [
      "Pengetahuan",
      "Berita",
      "Pengumuman",
      "FAQ",
      "Mikro",
      "Pelatihan",
      "Jalur Belajar",
    ];

    return {
      chart: {
        type: "bar",
        height: 278,
        stacked: true,
        fontFamily: "Rubik, Inter, system-ui, sans-serif",
        toolbar: { show: false },
      },
      colors: [colors.primary, colors.warning, colors.success],
      series: [
        {
          name: "Draf",
          data: [
            breakdown.knowledge?.draft || 0,
            breakdown.news?.draft || 0,
            breakdown.announcements?.draft || 0,
            breakdown.faqs?.draft || 0,
            breakdown.microlearning?.draft || 0,
            breakdown.training?.draft || 0,
            breakdown.learning_paths?.draft || 0,
          ],
        },
        {
          name: "Ditinjau",
          data: [
            breakdown.knowledge?.in_review || 0,
            breakdown.news?.in_review || 0,
            breakdown.announcements?.in_review || 0,
            breakdown.faqs?.in_review || 0,
            breakdown.microlearning?.in_review || 0,
            breakdown.training?.in_review || 0,
            breakdown.learning_paths?.in_review || 0,
          ],
        },
        {
          name: "Terbit",
          data: [
            breakdown.knowledge?.published || 0,
            breakdown.news?.published || 0,
            breakdown.announcements?.published || 0,
            breakdown.faqs?.published || 0,
            breakdown.microlearning?.published || 0,
            breakdown.training?.published || 0,
            breakdown.learning_paths?.published || 0,
          ],
        },
      ],
      plotOptions: {
        bar: {
          horizontal: false,
          borderRadius: 4,
          columnWidth: "42%",
        },
      },
      dataLabels: { enabled: false },
      legend: { show: false },
      grid: {
        strokeDashArray: 4,
        borderColor: "rgba(148, 163, 184, 0.2)",
      },
      xaxis: {
        categories,
        labels: { style: { fontSize: "11px" } },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
      yaxis: {
        min: 0,
        tickAmount: 4,
        labels: { style: { fontSize: "11px" } },
      },
      tooltip: { shared: true },
    };
  }, [breakdown, colors.primary, colors.warning, colors.success]);

  // Donut Workflow Distribution Chart Configuration
  const totalContent = kpi.total_draft + kpi.pending_review + kpi.total_published;
  const workflowOptions: ApexOptions = useMemo(() => {
    return {
      chart: {
        type: "donut",
        height: 220,
        fontFamily: "Rubik, Inter, system-ui, sans-serif",
      },
      series: [kpi.total_draft, kpi.pending_review, kpi.total_published, kpi.active_programs],
      labels: ["Draf", "Ditinjau", "Terbit", "Program Aktif"],
      colors: [colors.primary, colors.warning, colors.success, "#0284c7"],
      stroke: { width: 2 },
      plotOptions: {
        pie: {
          donut: {
            size: "70%",
            labels: {
              show: true,
              name: { show: true, offsetY: 17, fontSize: "11px" },
              value: {
                show: true,
                offsetY: -15,
                fontSize: "24px",
                fontWeight: 800,
                formatter: (val) => `${val}`,
              },
              total: {
                show: true,
                label: "Total Konten",
                fontSize: "11px",
                formatter: () => `${totalContent}`,
              },
            },
          },
        },
      },
      legend: { show: false },
      dataLabels: { enabled: false },
      tooltip: { enabled: true },
    };
  }, [kpi, totalContent, colors.primary, colors.warning, colors.success]);

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      {/* Chart 1: Tren Aktivitas Editorial & Distribusi Format */}
      <article className="admin-card p-6 lg:col-span-8" id="activity-chart-card">
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Aktivitas editorial & pembelajaran
            </span>
            <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
              {viewMode === "trend" ? "Tren Aktivitas Konten" : "Volume per Modul Pembelajaran"}
            </h2>
            <p className="text-xs text-slate-500">
              {viewMode === "trend"
                ? "Pergerakan konten yang dibuat, ditinjau, dan dipublikasikan."
                : "Perbandingan materi pembelajaran antar seluruh modul aktif."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setViewMode("trend")}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                  viewMode === "trend"
                    ? "bg-white text-sky-700 shadow-sm dark:bg-slate-900 dark:text-sky-300"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                Tren Waktu
              </button>
              <button
                type="button"
                onClick={() => setViewMode("modules")}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                  viewMode === "modules"
                    ? "bg-white text-sky-700 shadow-sm dark:bg-slate-900 dark:text-sky-300"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
                }`}
              >
                Format Modul
              </button>
            </div>

            {viewMode === "trend" ? (
              <label className="text-xs">
                <span className="sr-only">Rentang Waktu</span>
                <select
                  className="admin-input !min-h-9 !py-1 text-xs"
                  value={rangeDays}
                  onChange={(e) => setRangeDays(e.target.value as "7" | "14" | "30")}
                >
                  <option value="7">7 hari</option>
                  <option value="14">14 hari</option>
                  <option value="30">30 hari</option>
                </select>
              </label>
            ) : null}
          </div>
        </header>

        <div className="mt-4">
          <CubaApexChart
            options={viewMode === "trend" ? activityOptions : moduleOptions}
            height={278}
            ariaLabel={viewMode === "trend" ? "Grafik tren aktivitas editorial" : "Grafik volume per modul pembelajaran"}
          />
        </div>
      </article>

      {/* Chart 2: Distribusi Status Workflow (Donut Chart) */}
      <article className="admin-card p-6 lg:col-span-4" id="workflow-chart-card">
        <header>
          <span className="text-xs font-black uppercase tracking-wider text-slate-400">
            Status Konten
          </span>
          <h2 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
            Distribusi Workflow
          </h2>
          <p className="text-xs text-slate-500">
            Sebaran status materi pembelajaran platform.
          </p>
        </header>

        <div className="mt-2 flex justify-center">
          <CubaApexChart options={workflowOptions} height={220} ariaLabel="Grafik distribusi workflow konten" />
        </div>

        <ul className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full bg-sky-500" /> Draf
            </span>
            <strong className="font-extrabold text-slate-900 dark:text-white">{kpi.total_draft}</strong>
          </li>
          <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full bg-yellow-500" /> Ditinjau
            </span>
            <strong className="font-extrabold text-slate-900 dark:text-white">{kpi.pending_review}</strong>
          </li>
          <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Terbit
            </span>
            <strong className="font-extrabold text-slate-900 dark:text-white">{kpi.total_published}</strong>
          </li>
          <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-600 dark:text-slate-300">
              <span className="h-2 w-2 rounded-full bg-sky-700" /> Program Aktif
            </span>
            <strong className="font-extrabold text-slate-900 dark:text-white">{kpi.active_programs}</strong>
          </li>
        </ul>
      </article>
    </div>
  );
}
