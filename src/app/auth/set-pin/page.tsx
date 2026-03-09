"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Set PIN is now step 2 of the single registration wizard at /auth/register.
 */
export default function SetPinRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/auth/register");
  }, [router]);
  return (
    <main className="flex min-h-[var(--app-height,100dvh)] items-center justify-center">
      <p className="text-app-body-muted">Mengalihkan...</p>
    </main>
  );
}
