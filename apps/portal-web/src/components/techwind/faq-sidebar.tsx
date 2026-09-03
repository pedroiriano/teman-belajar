"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PortalIcon } from "@/components/portal-icon";

interface FAQCategory {
  id: string;
  name: string;
}

interface FAQSidebarProps {
  categories: FAQCategory[];
}

export function FAQSidebar({ categories }: FAQSidebarProps) {
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const handleScroll = () => {
      const sections = categories.map((cat) => ({
        id: cat.id,
        element: document.getElementById(`faq-category-${cat.id}`),
      }));

      let current = "";
      for (const section of sections) {
        if (section.element) {
          const rect = section.element.getBoundingClientRect();
          if (rect.top <= 160) {
            current = section.id;
          }
        }
      }
      setActiveId(current);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial check
    return () => window.removeEventListener("scroll", handleScroll);
  }, [categories]);

  return (
    <aside className="hidden lg:block lg:w-72 lg:shrink-0" aria-label="Navigasi Kategori FAQ">
      <div className="sticky top-24 portal-card p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 px-2">
          Daftar Kategori
        </h3>
        <nav aria-label="Kategori FAQ">
          <ul className="space-y-1">
            {categories.map((category) => {
              const isActive = activeId === category.id;
              return (
                <li key={category.id}>
                  <Link
                    href={`#faq-category-${category.id}`}
                    className={`flex items-center justify-between px-3.5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
                      isActive
                        ? "bg-primary text-white shadow-sm"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary dark:hover:text-primary"
                    }`}
                    aria-current={isActive ? "true" : undefined}
                  >
                    <span className="truncate">{category.name}</span>
                    <PortalIcon
                      name="chevron-right"
                      className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                        isActive ? "text-white opacity-90 translate-x-0.5" : "text-slate-400 opacity-50"
                      }`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}

/**
 * FAQAccordionController
 * Ensures exclusive accordion behavior: when one FAQ details item is opened,
 * any other currently opened FAQ details item is automatically closed.
 */
export function FAQAccordionController() {
  useEffect(() => {
    const handleToggle = (event: Event) => {
      const target = event.target as HTMLDetailsElement | null;
      if (!target || target.tagName !== "DETAILS" || !target.open) return;

      const groupName = target.getAttribute("name");
      const selector = groupName
        ? `details.portal-faq[name="${groupName}"]`
        : "details.portal-faq";

      const detailsList = document.querySelectorAll<HTMLDetailsElement>(selector);
      detailsList.forEach((item) => {
        if (item !== target && item.open) {
          item.open = false;
        }
      });
    };

    // Auto-open accordion if URL contains matching hash
    if (typeof window !== "undefined" && window.location.hash) {
      const targetId = window.location.hash.slice(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl && targetEl.tagName === "DETAILS") {
        (targetEl as HTMLDetailsElement).open = true;
      }
    }

    // Toggle event does not bubble, capturing phase catches it across all details elements
    document.addEventListener("toggle", handleToggle, true);
    return () => {
      document.removeEventListener("toggle", handleToggle, true);
    };
  }, []);

  return null;
}
