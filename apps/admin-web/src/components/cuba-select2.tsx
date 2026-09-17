"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { AdminIcon } from "@/components/admin-icon";

export interface CubaSelect2Option {
  value: string;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}

export interface CubaSelect2Props {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: CubaSelect2Option[];
  placeholder?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  triggerClassName?: string;
  dropdownClassName?: string;
  "aria-label"?: string;
}

export function CubaSelect2({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = "Pilih opsi...",
  searchable = true,
  searchPlaceholder = "Cari opsi...",
  disabled = false,
  required = false,
  className = "",
  triggerClassName = "",
  dropdownClassName = "",
  "aria-label": ariaLabel,
}: CubaSelect2Props) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Selected Option
  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  // Filtered Options based on Search Query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase().trim();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(query))
    );
  }, [options, searchQuery]);

  const openDropdown = useCallback(() => {
    setIsOpen(true);
    setSearchQuery("");
    const initialIndex = options.findIndex((opt) => opt.value === value);
    setHighlightedIndex(initialIndex >= 0 ? initialIndex : 0);
  }, [options, value]);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setSearchQuery("");
    setHighlightedIndex(-1);
  }, []);

  // Click Outside to Close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeDropdown();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, closeDropdown]);

  // Autofocus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, searchable]);

  // Handle select option
  const handleSelect = useCallback(
    (optValue: string, optDisabled?: boolean) => {
      if (optDisabled) return;
      onChange(optValue);
      closeDropdown();
    },
    [onChange, closeDropdown]
  );

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case "Enter":
      case " ":
        if (!isOpen) {
          e.preventDefault();
          openDropdown();
        } else if (
          highlightedIndex >= 0 &&
          highlightedIndex < filteredOptions.length
        ) {
          e.preventDefault();
          const target = filteredOptions[highlightedIndex];
          handleSelect(target.value, target.disabled);
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (!isOpen) {
          openDropdown();
        } else {
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!isOpen) {
          openDropdown();
        } else {
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
        }
        break;
      case "Escape":
      case "Tab":
        if (isOpen) {
          e.preventDefault();
          closeDropdown();
        }
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`cuba-select2-container relative w-full ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Hidden native input for form compatibility */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={value}
          required={required}
          aria-hidden="true"
        />
      )}

      {/* Select2 Trigger Button */}
      <button
        type="button"
        id={selectId}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || placeholder}
        onClick={() => {
          if (!disabled) {
            if (isOpen) closeDropdown();
            else openDropdown();
          }
        }}
        className={`group flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2 text-left text-xs font-semibold shadow-sm transition-all duration-150 focus:outline-none dark:bg-slate-900 ${
          disabled
            ? "cursor-not-allowed opacity-50 border-slate-200 dark:border-slate-800"
            : isOpen
            ? "border-sky-500 ring-2 ring-sky-500/20 text-slate-900 dark:text-white"
            : "border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200"
        } ${triggerClassName}`}
      >
        <span className="truncate min-w-0">
          {selectedOption ? (
            <span className="font-semibold text-slate-900 dark:text-white">
              {selectedOption.label}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500">
              {placeholder}
            </span>
          )}
        </span>
        <span
          className={`shrink-0 text-slate-400 dark:text-slate-500 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-sky-600 dark:text-sky-400" : ""
          }`}
        >
          <AdminIcon name="chevron-down" className="h-4 w-4 stroke-[2]" />
        </span>
      </button>

      {/* Select2 Results Dropdown */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full z-[120] mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-1 duration-150 dark:border-slate-700 dark:bg-slate-900 ${dropdownClassName}`}
        >
          {/* Search Filter Box */}
          {searchable && (
            <div className="border-b border-slate-100 p-2 dark:border-slate-800">
              <div className="relative">
                <AdminIcon
                  name="search"
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:bg-slate-900"
                  onClick={(e) => e.stopPropagation()}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <AdminIcon name="close" className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Options List */}
          <ul
            ref={listboxRef}
            role="listbox"
            tabIndex={-1}
            className="max-h-60 overflow-y-auto p-1 text-xs focus:outline-none scrollbar-thin"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                Tidak ada opsi yang sesuai
              </li>
            ) : (
              filteredOptions.map((opt, index) => {
                const isSelected = opt.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={opt.disabled}
                    onClick={() => handleSelect(opt.value, opt.disabled)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs transition-colors cursor-pointer ${
                      opt.disabled
                        ? "cursor-not-allowed opacity-40"
                        : isSelected
                        ? "bg-sky-50 font-bold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300"
                        : isHighlighted
                        ? "bg-slate-100 text-slate-900 dark:bg-slate-800/80 dark:text-white"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <span className="shrink-0 text-sky-600 dark:text-sky-400">
                        <AdminIcon name="check" className="h-3.5 w-3.5 stroke-[2.5]" />
                      </span>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
