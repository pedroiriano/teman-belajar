import { ComingSoonState } from "@/components/techwind";

/** Legacy compatibility component; Webinar actions remain intentionally fail-closed. */
export function WebinarActions() {
  return <ComingSoonState title="Aksi Webinar belum tersedia" description="Tindakan sesi tetap nonaktif sampai feature gate Webinar dibuka." />;
}
