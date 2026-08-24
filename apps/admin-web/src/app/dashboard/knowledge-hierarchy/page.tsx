import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

import { KnowledgeHierarchyManager } from "@/components/knowledge/KnowledgeHierarchyManager";
import { AdminUnauthorized } from "@/components/admin-states";
import { authOptions } from "@/lib/auth";

export const metadata = { title: "Struktur Pengetahuan | Admin Teman Belajar" };

export default async function KnowledgeHierarchyPage() {
  const session: any = await getServerSession(authOptions);
  if (!session) redirect("/api/auth/signin");
  const hasAccess = session.roles?.some((role: string) => ["Portal Administrator", "Content Editor", "Reviewer"].includes(role));
  if (!hasAccess) return <AdminUnauthorized resource="struktur pengetahuan" />;
  return <div className="admin-page">
    <div className="admin-page-header"><div><p className="admin-kicker">Pusat Pengetahuan</p><h1 className="admin-page-title">Struktur Pengetahuan</h1><p className="admin-page-copy">Kelola hierarchy generik, placement artikel, dan breadcrumb publik tanpa mengubah identitas atau mesin Moodle.</p></div><span className="admin-status bg-sky-50 text-sky-800">Adjacency tree · depth 8</span></div>
    <KnowledgeHierarchyManager />
  </div>;
}
