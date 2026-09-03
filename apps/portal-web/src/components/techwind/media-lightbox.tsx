"use client";

import { useEffect, useCallback } from "react";
import { PortalIcon } from "@/components/portal-icon";

export interface LightboxItem {
  id: string;
  title: string;
  src: string;
  kind?: "image" | "video";
  description?: string;
}

interface MediaLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  items: LightboxItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

export function MediaLightbox({
  isOpen,
  onClose,
  items,
  currentIndex,
  onIndexChange,
}: MediaLightboxProps) {
  const currentItem = items[currentIndex];

  const handlePrev = useCallback(() => {
    if (items.length <= 1) return;
    onIndexChange((currentIndex - 1 + items.length) % items.length);
  }, [currentIndex, items.length, onIndexChange]);

  const handleNext = useCallback(() => {
    if (items.length <= 1) return;
    onIndexChange((currentIndex + 1) % items.length);
  }, [currentIndex, items.length, onIndexChange]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose, handlePrev, handleNext]);

  if (!isOpen || !currentItem) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={currentItem.title || "Pratinjau media"}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 sm:p-6 md:p-10 transition-opacity duration-300"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup pratinjau"
        className="absolute top-4 right-4 z-20 flex size-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition duration-300 focus:outline-none focus:ring-2 focus:ring-white"
      >
        <span className="text-2xl font-bold leading-none">&times;</span>
      </button>

      {/* Navigation - Prev */}
      {items.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handlePrev();
          }}
          aria-label="Media sebelumnya"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex size-10 sm:size-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition duration-300 focus:outline-none focus:ring-2 focus:ring-white"
        >
          <PortalIcon name="chevron-left" className="h-6 w-6" />
        </button>
      )}

      {/* Navigation - Next */}
      {items.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          aria-label="Media selanjutnya"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex size-10 sm:size-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 transition duration-300 focus:outline-none focus:ring-2 focus:ring-white"
        >
          <PortalIcon name="chevron-right" className="h-6 w-6" />
        </button>
      )}

      {/* Main Content Container */}
      <div
        className="relative max-h-[90vh] max-w-5xl w-full flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex max-h-[75vh] w-full items-center justify-center overflow-hidden rounded-lg shadow-2xl">
          {currentItem.kind === "video" ? (
            <video
              src={currentItem.src}
              controls
              autoPlay
              className="max-h-[75vh] max-w-full rounded-lg object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentItem.src}
              alt={currentItem.title}
              className="max-h-[75vh] max-w-full rounded-lg object-contain"
            />
          )}
        </div>

        {/* Info bar below media */}
        <div className="mt-4 flex w-full flex-col sm:flex-row items-center justify-between text-white text-center sm:text-left gap-2 px-2">
          <div>
            <h2 className="text-lg font-bold">{currentItem.title}</h2>
            {currentItem.description && (
              <p className="text-sm text-white/70 mt-0.5 line-clamp-2">
                {currentItem.description}
              </p>
            )}
          </div>
          {items.length > 1 && (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 shrink-0">
              {currentIndex + 1} / {items.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
