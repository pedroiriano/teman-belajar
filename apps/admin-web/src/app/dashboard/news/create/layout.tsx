import { EditorOnly } from "@/components/editor-only";

export default function NewsCreateLayout({ children }: { children: React.ReactNode }) {
  return <EditorOnly resource="berita">{children}</EditorOnly>;
}
