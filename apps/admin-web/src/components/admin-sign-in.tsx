"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function AdminSignIn() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = () => {
    setIsLoading(true);
    void signIn("keycloak", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="mt-8">
      <button 
        type="button" 
        className="admin-button w-full !min-h-12 disabled:opacity-50 disabled:cursor-not-allowed" 
        onClick={handleSignIn}
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-200 border-t-white" aria-hidden="true" />
            Menyambungkan sesi...
          </span>
        ) : (
          "Masuk dengan Akun Organisasi"
        )}
      </button>
    </div>
  );
}
