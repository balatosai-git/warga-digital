"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * OTP verification is obsolete; auth uses PIN. Redirect to register.
 */
export default function OtpPage() {
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
