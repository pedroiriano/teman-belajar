"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

export interface TabFilterOption {
  value: string;
  label: string;
}

export interface TabFiltersProps {
  options: TabFilterOption[];
  paramName: string;
  basePath: string;
  className?: string;
  align?: "left" | "center" | "right";
}

export function TabFilters({
  options,
  paramName,
  basePath,
  className = "",
  align = "left",
}: TabFiltersProps) {
  const searchParams = useSearchParams();
  const currentValue = searchParams.get(paramName) || "";

  const alignmentClass =
    align === "center"
      ? "justify-center"
      : align === "right"
      ? "justify-end"
      : "justify-start";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${alignmentClass} ${className}`}>
      {options.map((option) => {
        const isActive = option.value === currentValue;
        const params = new URLSearchParams(searchParams.toString());
        if (option.value) {
          params.set(paramName, option.value);
        } else {
          params.delete(paramName);
        }
        params.delete("page");
        const href = `${basePath}${params.size ? `?${params}` : ""}`;

        return (
          <Link
            key={option.value}
            href={href}
            className={`px-4 py-2 text-xs sm:text-sm font-semibold rounded-full border transition-all duration-300 ${
              isActive
                ? "bg-primary text-white border-primary shadow-sm"
                : "bg-white text-slate-700 border-slate-200 hover:border-primary hover:text-primary dark:bg-[#111a2e] dark:text-slate-200 dark:border-slate-700 dark:hover:border-primary dark:hover:text-white shadow-xs"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}
