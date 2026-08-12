import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminDashboard() {
  const session: any = await getServerSession(authOptions);

  if (!session) {
    redirect("/api/auth/signin");
  }

  const hasAdminRole = session.roles?.includes("Portal Administrator");

  if (!hasAdminRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-8">
        <div className="bg-red-900/50 border border-red-500 p-8 rounded-lg max-w-lg w-full">
          <h1 className="text-3xl font-bold mb-4 text-red-400">403 Forbidden</h1>
          <p className="mb-6">You do not have the necessary permissions to access the Admin Shell.</p>
          <a href="/" className="text-blue-400 hover:underline">Return to Home</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Admin Shell Dashboard</h1>
      <p>This is a protected route. Only users with the Portal Administrator role can see this.</p>
    </div>
  );
}
