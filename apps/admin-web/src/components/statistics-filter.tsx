"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function StatisticsFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentDays = searchParams.get("days") || "30";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const days = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.set("days", days);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="days-filter" className="text-sm font-medium text-slate-600 dark:text-slate-400">
        Rentang Waktu:
      </label>
      <select
        id="days-filter"
        value={currentDays}
        onChange={handleChange}
        className="admin-input !w-auto !rounded-lg !px-3 !py-2 font-semibold"
      >
        <option value="1">1 Hari Terakhir</option>
        <option value="7">7 Hari Terakhir</option>
        <option value="30">30 Hari Terakhir</option>
        <option value="90">3 Bulan Terakhir</option>
        <option value="180">6 Bulan Terakhir</option>
        <option value="365">1 Tahun Terakhir</option>
      </select>
    </div>
  );
}
