import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";

import { AdminUnauthorized } from "@/components/admin-states";
import { authOptions } from "@/lib/auth";

export async function EditorOnly({ children, resource }: { children: React.ReactNode; resource: string }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/api/auth/signin?callbackUrl=/dashboard");

  const roles = (session as typeof session & { roles?: string[] }).roles || [];
  const canCreate = roles.some((role) => ["Portal Administrator", "Content Editor"].includes(role));
  if (!canCreate) {
    return <AdminUnauthorized resource={resource} message="Role Portal Administrator atau Content Editor diperlukan untuk membuat konten baru." />;
  }
  return children;
}
