"use client";

/* eslint-disable @next/next/no-img-element -- validated Media and licensed Techwind assets */

import Link from "next/link";
import type { ReactNode } from "react";
import { PortalIcon, type PortalIconName } from "@/components/portal-icon";

export type QuickFactItem = {
  icon?: PortalIconName;
  label: string;
  value: string;
};

export type InstructorItem = {
  name: string;
  role: string;
  image?: string;
  organization?: string;
};

export type DetailSidebarProps = {
  imageSrc?: string;
  imageAlt?: string;
  factsTitle?: string;
  facts?: QuickFactItem[];
  progress?: {
    percent: number;
    label?: string;
    completedCount?: number;
    totalCount?: number;
  } | null;
  primaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
    disabled?: boolean;
    subtext?: string;
  } | null;
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
    disabled?: boolean;
  } | null;
  people?: InstructorItem[];
  peopleTitle?: string;
  children?: ReactNode;
  className?: string;
};

export function DetailSidebar({
  imageSrc,
  imageAlt = "Ilustrasi konten",
  factsTitle = "Informasi Penting",
  facts = [],
  progress,
  primaryAction,
  secondaryAction,
  people = [],
  peopleTitle = "Instruktur & Narasumber",
  children,
  className = "",
}: DetailSidebarProps) {
  return (
    <aside className={`space-y-6 ${className}`} aria-label="Informasi Pelatihan dan Pendaftaran">
      {/* Main Card */}
      <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 p-6 shadow-sm overflow-hidden">
        {imageSrc ? (
          <div className="relative mb-5 overflow-hidden rounded-lg aspect-video w-full bg-slate-100 dark:bg-slate-800">
            <img
              src={imageSrc}
              alt={imageAlt}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : null}

        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
          {factsTitle}
        </h3>

        {/* Quick Facts */}
        {facts.length > 0 ? (
          <ul className="space-y-3.5 divide-y divide-gray-100 dark:divide-slate-800/80 mb-6">
            {facts.map((fact, idx) => (
              <li key={idx} className="flex items-center justify-between pt-3.5 first:pt-0">
                <div className="flex items-center gap-2.5 text-slate-500 dark:text-slate-400 text-sm">
                  {fact.icon ? (
                    <span className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <PortalIcon name={fact.icon} className="size-4" />
                    </span>
                  ) : null}
                  <span>{fact.label}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white text-sm text-right">
                  {fact.value}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {/* Progress Bar (if enrolled) */}
        {progress != null ? (
          <div className="mb-6 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-600 dark:text-slate-400 font-medium">
                {progress.label || "Progres Belajar"}
              </span>
              <strong className="font-black text-slate-900 dark:text-white">
                {Math.round(progress.percent)}%
              </strong>
            </div>
            <div
              className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
              role="progressbar"
              aria-valuenow={progress.percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
              />
            </div>
            {progress.completedCount != null && progress.totalCount != null ? (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {progress.completedCount} dari {progress.totalCount} materi terselesaikan
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Action Buttons (CTA) */}
        <div className="space-y-3">
          {primaryAction ? (
            primaryAction.href ? (
              <Link
                href={primaryAction.href}
                className={`portal-button-primary w-full text-center ${
                  primaryAction.disabled ? "opacity-60 cursor-not-allowed pointer-events-none" : ""
                }`}
                aria-disabled={primaryAction.disabled}
              >
                {primaryAction.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                className="portal-button-primary w-full text-center disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {primaryAction.label}
              </button>
            )
          ) : null}

          {primaryAction?.subtext ? (
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 leading-relaxed px-2">
              {primaryAction.subtext}
            </p>
          ) : null}

          {secondaryAction ? (
            secondaryAction.href ? (
              <Link
                href={secondaryAction.href}
                className={`portal-button-secondary w-full text-center ${
                  secondaryAction.disabled ? "opacity-60 cursor-not-allowed pointer-events-none" : ""
                }`}
                aria-disabled={secondaryAction.disabled}
              >
                {secondaryAction.label}
              </Link>
            ) : (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                disabled={secondaryAction.disabled}
                className="portal-button-secondary w-full text-center disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {secondaryAction.label}
              </button>
            )
          ) : null}
        </div>

        {children}
      </div>

      {/* People / Instructor Widget */}
      {people.length > 0 ? (
        <div className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
            {peopleTitle}
          </h3>
          <div className="space-y-4">
            {people.map((person, idx) => (
              <div key={idx} className="flex items-center gap-3.5">
                {person.image ? (
                  <img
                    src={person.image}
                    alt={person.name}
                    className="size-12 rounded-full object-cover shrink-0 border border-slate-100 dark:border-slate-800 shadow-sm"
                  />
                ) : (
                  <span className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0">
                    {person.name.charAt(0)}
                  </span>
                )}
                <div className="min-w-0">
                  <strong className="block text-sm font-bold text-slate-900 dark:text-white truncate">
                    {person.name}
                  </strong>
                  <span className="block text-xs text-slate-500 dark:text-slate-400 truncate">
                    {person.role}
                  </span>
                  {person.organization ? (
                    <span className="block text-[11px] text-slate-400 dark:text-slate-500 truncate">
                      {person.organization}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
