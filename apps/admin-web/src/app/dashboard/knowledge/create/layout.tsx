import { EditorOnly } from "@/components/editor-only";

export default function KnowledgeCreateLayout({ children }: { children: React.ReactNode }) {
  return <EditorOnly resource="artikel pengetahuan">{children}</EditorOnly>;
}
