import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

export default async function Home() {
  const session: any = await getServerSession(authOptions);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-slate-900 text-white">
      <h1 className="text-4xl font-bold mb-8">Admin Portal</h1>
      
      {session ? (
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg max-w-md w-full border border-slate-700">
          <p className="mb-2">Welcome, <strong>{session.user?.name || session.user?.email}</strong>!</p>
          <p className="mb-6 text-sm text-slate-400">Roles: {session.roles?.join(", ") || "None"}</p>
          <div className="flex flex-col gap-4">
            <Link 
              href="/api/auth/signout" 
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-center transition-colors"
            >
              Sign out
            </Link>
            <Link 
              href="/dashboard" 
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded text-center transition-colors"
            >
              Enter Admin Shell
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p>Please sign in to access the admin portal.</p>
          <Link 
            href="/api/auth/signin" 
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-center transition-colors"
          >
            Sign in
          </Link>
        </div>
      )}
    </main>
  );
}
