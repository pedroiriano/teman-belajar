"use client";

import { useRouter } from "next/navigation";
import MediaUploadPanel from "@/components/media/MediaUploadPanel";

export default function MediaUploader() {
  const router = useRouter();
  return <MediaUploadPanel onUploaded={() => router.refresh()} />;
}

