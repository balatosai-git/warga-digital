"use client";

import { CheckBadgeIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { PageScreen, PrimaryButton, DotIndicators } from "@/components/ui";
import { OnboardingScreenProps } from "./onboarding-shared";

export function ScreenTrust({
  currentIndex,
  totalScreens,
}: OnboardingScreenProps) {
  const router = useRouter();
  const setCompleted = useOnboardingStore((s) => s.setCompleted);

  const handleMulai = () => {
    setCompleted(true);
    router.replace("/auth/register");
  };

  return (
    <PageScreen
      header={
        <span className="w-full text-center text-sm font-semibold tracking-wide text-app-primary">
          Warga Digital
        </span>
      }
      footer={
        <>
          <DotIndicators total={totalScreens} current={currentIndex} />
          <PrimaryButton onPress={handleMulai}>Mulai sekarang</PrimaryButton>
        </>
      }
    >
      <div className="flex shrink-0 items-center justify-center py-2">
        <TrustIllustration />
      </div>
      <div className="flex shrink-0 flex-col gap-2 pt-2">
        <h1 className="text-2xl font-bold leading-tight text-app-title">
          Aman, Resmi, dan Terverifikasi
        </h1>
        <p className="text-sm leading-relaxed text-app-body">
          Akun terverifikasi. Identitas jelas. Domisili valid. Tanpa anonim. Tanpa kepalsuan. Tanpa kebocoran. Satu platform untuk administrasi resmi, kebutuhan warga, jasa, acara, donasi, dan informasi terintegrasi.
        </p>
      </div>
    </PageScreen>
  );
}

function TrustIllustration() {
  return (
    <div className="relative w-full max-w-[220px]">
      <CheckBadgeIcon className="absolute -right-1 -top-4 h-10 w-10 text-emerald-500" />

      <div className="mt-10 space-y-4">
        <div className="h-7 w-full rounded-full bg-emerald-100 p-0.5">
          <div className="h-full w-full rounded-full bg-emerald-500" />
        </div>

        <div className="h-7 w-full rounded-full bg-emerald-100 p-0.5">
          <div className="flex h-full w-[60%] items-center justify-end rounded-full bg-emerald-400 px-2 text-[11px] font-semibold text-white">
            60%
          </div>
        </div>

        <div className="h-7 w-full rounded-full bg-emerald-100 p-0.5">
          <div className="flex h-full w-[8%] items-center justify-end rounded-full bg-emerald-300 px-2 text-[11px] font-semibold text-emerald-900">
            0%
          </div>
        </div>
      </div>
    </div>
  );
}
