"use client";

import { signIn } from "next-auth/react";
import { useEffect } from "react";

export default function SsoCheckPage() {
  useEffect(() => {
    void signIn("keycloak", { callbackUrl: "/sso/complete" }, { prompt: "none" });
  }, []);
  return <p className="sr-only">Memeriksa sesi organisasi.</p>;
}
