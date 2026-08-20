import { EditorOnly } from "@/components/editor-only";

export default function AnnouncementCreateLayout({ children }: { children: React.ReactNode }) {
  return <EditorOnly resource="pengumuman">{children}</EditorOnly>;
}
