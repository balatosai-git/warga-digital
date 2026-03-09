"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useAuthStore } from "@/stores/auth-store";
import { PageLoader } from "@/components/ui";

export default function HomePage() {
  const router = useRouter();
  const onboardingCompleted = useOnboardingStore((s) => s.completed);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!onboardingCompleted) {
      router.replace("/onboarding");
      return;
    }
    if (!isAuthenticated) {
      router.replace("/auth/login");
      return;
    }
    router.replace("/landing");
  }, [onboardingCompleted, isAuthenticated, router]);

  return <PageLoader message="Memuat..." />;
}
