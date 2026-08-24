"use client";

/* eslint-disable @next/next/no-img-element -- Authenticated BFF media uses runtime MIME types and URLs. */

import { useState } from "react";

type MediaPreviewImageProps = {
  src: string;
  alt: string;
  className: string;
};

export function MediaPreviewImage({ src, alt, className }: MediaPreviewImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="flex h-full w-full items-center justify-center px-2 text-center text-xs font-bold text-slate-500">
        Pratinjau tidak tersedia
      </span>
    );
  }

  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}
