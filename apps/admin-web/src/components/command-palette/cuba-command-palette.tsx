"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AdminIcon, type AdminIconName } from "@/components/admin-icon";
import { navigationGroups, canAccessItem, type NavigationItem } from "@/lib/navigation";

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  href: string;
  icon: AdminIconName;
  category: "action" | "navigation" | "recent";
  badge?: string;
  requiredRole?: string;
  requiredAnyRole?: string[];
}

const QUICK_ACTIONS: CommandItem[] = [
  {
    id: "act-create-news",
    label: "Buat Berita Baru",
    description: "Tulis dan publikasikan berita atau artikel terkini",
    href: "/dashboard/news/create",
    icon: "news",
    category: "action",
    badge: "Editorial",
  },
  {
    id: "act-create-knowledge",
    label: "Buat Artikel Pengetahuan",
    description: "Dokumentasikan artikel dan panduan baru",
    href: "/dashboard/knowledge/create",
    icon: "file",
    category: "action",
    badge: "Editorial",
  },
  {
    id: "act-create-announcement",
    label: "Buat Pengumuman Baru",
    description: "Kirim informasi penting ke seluruh pengguna platform",
    href: "/dashboard/announcements/create",
    icon: "announcement",
    category: "action",
    badge: "Editorial",
  },
  {
    id: "act-review-queue",
    label: "Buka Antrean Peninjauan",
    description: "Tinjau dan setujui draf konten editorial",
    href: "/dashboard/review-queue",
    icon: "check",
    category: "action",
    badge: "Workflow",
  },
  {
    id: "act-schedule",
    label: "Jadwal & Kalender Publikasi",
    description: "Pantau dan atur kalender jadwal rilis",
    href: "/dashboard/schedule",
    icon: "calendar",
    category: "action",
    badge: "Perencanaan",
  },
  {
    id: "act-statistics",
    label: "Statistik & Analitik Platform",
    description: "Pantau performa, pengunjung, dan tren modul",
    href: "/dashboard/statistics",
    icon: "grid",
    category: "action",
    badge: "Observabilitas",
  },
  {
    id: "act-integration-health",
    label: "Kesehatan Integrasi Sistem",
    description: "Periksa status probe dependensi layanan sistem",
    href: "/dashboard/integration-health",
    icon: "health",
    category: "action",
    badge: "Admin",
    requiredRole: "Portal Administrator",
    requiredAnyRole: ["Portal Administrator"],
  },
  {
    id: "act-audit",
    label: "Pusat Audit Keamanan",
    description: "Log aktivitas dan jejak perubahan sistem",
    href: "/dashboard/audit",
    icon: "audit",
    category: "action",
    badge: "Admin",
    requiredRole: "Portal Administrator",
    requiredAnyRole: ["Portal Administrator"],
  },
  {
    id: "act-users",
    label: "Manajemen Pengguna",
    description: "Kelola akun pengguna, profil, dan hak akses",
    href: "/dashboard/users",
    icon: "users",
    category: "action",
    badge: "Admin",
  },
  {
    id: "act-roles",
    label: "Peran & Otorisasi (RBAC)",
    description: "Atur matriks izin per modul dan buat peran kustom",
    href: "/dashboard/roles",
    icon: "users",
    category: "action",
    badge: "Admin",
    requiredRole: "Portal Administrator",
    requiredAnyRole: ["Portal Administrator"],
  },
  {
    id: "act-media-gallery",
    label: "Galeri & Pustaka Media",
    description: "Aset gambar, dokumen, dan berkas terunggah",
    href: "/dashboard/media-gallery",
    icon: "media",
    category: "action",
    badge: "Aset",
  },
];

const RECENT_SEARCHES_KEY = "cuba_recent_searches";
const MAX_RECENT = 5;

export function openCubaCommandPalette() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cuba:open-command-palette"));
  }
}

interface CubaCommandPaletteProps {
  role?: string;
  roles?: string[] | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export function CubaCommandPalette({
  role = "User",
  roles = [],
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
}: CubaCommandPaletteProps) {
  const router = useRouter();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<CommandItem[]>(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) return JSON.parse(stored);
      }
    } catch {
      // Ignore localStorage errors
    }
    return [];
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleClose = useCallback(() => {
    if (isControlled && controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
    setQuery("");
    setActiveIndex(0);
  }, [isControlled, controlledOnClose]);

  // Save to recent searches
  const recordRecentSearch = useCallback((item: CommandItem) => {
    try {
      const existing = localStorage.getItem(RECENT_SEARCHES_KEY);
      let list: CommandItem[] = existing ? JSON.parse(existing) : [];
      list = [item, ...list.filter((x) => x.href !== item.href)].slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
      setRecentSearches(list);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const clearRecentSearches = useCallback(() => {
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
      setRecentSearches([]);
    } catch {
      // Ignore
    }
  }, []);

  // Listen for global shortcut (Ctrl+K / Cmd+K) and custom event
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          handleClose();
        } else {
          setInternalIsOpen(true);
        }
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        handleClose();
      }
    };

    const handleCustomOpen = () => {
      setInternalIsOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("cuba:open-command-palette", handleCustomOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("cuba:open-command-palette", handleCustomOpen);
    };
  }, [isOpen, handleClose]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Prepare navigation items
  const navigationItems = useMemo<CommandItem[]>(() => {
    return navigationGroups
      .flatMap((group) =>
        group.items.map((item: NavigationItem) => ({
          id: `nav-${item.id}`,
          label: item.label,
          description: `Modul ${group.label}`,
          href: item.href || `/dashboard/${item.id}`,
          icon: item.icon,
          category: "navigation" as const,
          badge: group.label,
          requiredRole: item.requiredRole,
          requiredAnyRole: item.requiredAnyRole,
          disabled: item.disabled,
        }))
      )
      .filter((item) => !item.disabled && canAccessItem(item as unknown as NavigationItem, roles, role));
  }, [role, roles]);

  // Available action items filtered by role
  const availableActions = useMemo<CommandItem[]>(() => {
    return QUICK_ACTIONS.filter((act) => canAccessItem(act as unknown as NavigationItem, roles, role));
  }, [role, roles]);

  // Filtered results based on query
  const filteredResults = useMemo<CommandItem[]>(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      // Default view when query is empty: recent searches (if any) + top quick actions
      const results: CommandItem[] = [];
      if (recentSearches.length > 0) {
        results.push(...recentSearches.map((item) => ({ ...item, category: "recent" as const })));
      }
      results.push(...availableActions.slice(0, 6));
      return results;
    }

    const matchesQuery = (text?: string) => (text ? text.toLowerCase().includes(trimmed) : false);

    const actionMatches = availableActions.filter(
      (item) => matchesQuery(item.label) || matchesQuery(item.description) || matchesQuery(item.badge)
    );

    const navMatches = navigationItems.filter(
      (item) => matchesQuery(item.label) || matchesQuery(item.description) || matchesQuery(item.badge)
    );

    return [...actionMatches, ...navMatches];
  }, [query, availableActions, navigationItems, recentSearches]);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setActiveIndex(0);
  };

  // Handle item selection
  const selectItem = useCallback(
    (item: CommandItem) => {
      recordRecentSearch(item);
      handleClose();
      router.push(item.href);
    },
    [router, handleClose, recordRecentSearch]
  );

  // Keyboard navigation within list (Up/Down/Enter)
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (filteredResults.length > 0 ? (prev + 1) % filteredResults.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) =>
        filteredResults.length > 0 ? (prev - 1 + filteredResults.length) % filteredResults.length : 0
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredResults.length > 0 && activeIndex >= 0 && activeIndex < filteredResults.length) {
        selectItem(filteredResults[activeIndex]);
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current && filteredResults.length > 0) {
      const activeElement = listRef.current.querySelector(`[data-index="${activeIndex}"]`) as HTMLElement | null;
      if (activeElement) {
        activeElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex, filteredResults]);

  if (!isOpen) return null;

  return (
    <div
      className="cuba-command-palette-backdrop fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 p-4 pt-[10vh] backdrop-blur-sm sm:pt-[12vh]"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette Global"
    >
      <div
        className="cuba-command-palette-card relative flex w-full max-w-2xl flex-col overflow-hidden rounded-[15px] border border-slate-200 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Search Input Bar */}
        <div className="flex items-center border-b border-slate-200 px-4 py-3.5 dark:border-slate-800">
          <AdminIcon name="search" className="h-5 w-5 shrink-0 text-sky-500 dark:text-sky-400" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={filteredResults.length > 0}
            aria-controls="cuba-command-list"
            aria-autocomplete="list"
            className="ml-3 flex-1 bg-transparent text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
            placeholder="Ketik rute, modul, atau aksi cepat (cth: Berita, Review, Jadwal, Buat)..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          {query ? (
            <button
              type="button"
              onClick={() => handleQueryChange("")}
              className="mr-2 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Bersihkan pencarian"
            >
              <AdminIcon name="close" className="h-4 w-4" />
            </button>
          ) : null}
          <kbd className="hidden rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div
          id="cuba-command-list"
          ref={listRef}
          role="listbox"
          aria-label="Daftar perintah dan rute"
          className="max-h-[60vh] overflow-y-auto p-2"
        >
          {filteredResults.length === 0 ? (
            <div className="py-12 text-center">
              <AdminIcon name="search" className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                Tidak ada hasil untuk &ldquo;{query}&rdquo;
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Coba gunakan kata kunci umum seperti &ldquo;Berita&rdquo;, &ldquo;Pengetahuan&rdquo;, atau &ldquo;Statistik&rdquo;.
              </p>
            </div>
          ) : (
            <div>
              {/* Grouping Header Helper */}
              {!query && recentSearches.length > 0 && (
                <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  <span>Pencarian Terkini</span>
                  <button
                    type="button"
                    onClick={clearRecentSearches}
                    className="text-[10px] lowercase text-sky-600 hover:underline dark:text-sky-400"
                  >
                    hapus riwayat
                  </button>
                </div>
              )}

              {filteredResults.map((item, idx) => {
                const isActive = idx === activeIndex;
                const isRecent = item.category === "recent";
                const isAction = item.category === "action";

                return (
                  <button
                    key={`${item.id}-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    data-index={idx}
                    onClick={() => selectItem(item)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all ${
                      isActive
                        ? "bg-sky-50 font-bold text-sky-800 shadow-sm dark:bg-sky-950/50 dark:text-sky-200"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    <div
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                        isActive
                          ? "bg-sky-500 text-white shadow-sm"
                          : isAction
                            ? "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400"
                            : isRecent
                              ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      <AdminIcon name={item.icon} className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">{item.label}</span>
                        {item.badge && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              isActive
                                ? "bg-sky-200/80 text-sky-900 dark:bg-sky-900 dark:text-sky-200"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p
                          className={`mt-0.5 truncate text-xs ${
                            isActive ? "text-sky-700/80 dark:text-sky-300/80" : "text-slate-400"
                          }`}
                        >
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 text-right">
                      {isActive && (
                        <span className="inline-flex items-center gap-1 rounded bg-sky-200/60 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800 dark:bg-sky-900/80 dark:text-sky-300">
                          Buka ↵
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-200 bg-slate-50/70 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-slate-300 bg-white px-1 py-0.5 text-[9px] font-bold dark:border-slate-700 dark:bg-slate-800">
                ↑
              </kbd>
              <kbd className="rounded border border-slate-300 bg-white px-1 py-0.5 text-[9px] font-bold dark:border-slate-700 dark:bg-slate-800">
                ↓
              </kbd>
              <span>Navigasi</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-slate-300 bg-white px-1 py-0.5 text-[9px] font-bold dark:border-slate-700 dark:bg-slate-800">
                ↵
              </kbd>
              <span>Pilih</span>
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[10px] text-sky-600 dark:text-sky-400 font-semibold">
            <span>Pencarian Global</span>
            <span>•</span>
            <span className="font-mono">Ctrl+K</span>
          </div>
        </div>
      </div>
    </div>
  );
}
