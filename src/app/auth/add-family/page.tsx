"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Add-family is now step 1 of the single registration wizard at /auth/register.
 */
export default function AddFamilyRedirectPage() {
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
