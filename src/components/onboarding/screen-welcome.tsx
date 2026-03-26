"use client";

import { ArrowPathIcon, HomeModernIcon, SunIcon } from "@heroicons/react/24/solid";
import { PageScreen, PrimaryButton, DotIndicators } from "@/components/ui";
import { OnboardingScreenProps, SkipButton } from "./onboarding-shared";

export function ScreenWelcome({
  onNext,
  onSkip,
  currentIndex,
  totalScreens,
}: OnboardingScreenProps) {
  return (
    <PageScreen
      header={<div className="w-full flex justify-start"><SkipButton onSkip={onSkip} /></div>}
      footer={
        <>
          <DotIndicators total={totalScreens} current={currentIndex} />
          <PrimaryButton onPress={onNext}>Berikutnya</PrimaryButton>
        </>
      }
    >
      <div className="flex shrink-0 items-center justify-center py-2">
        <WelcomeIllustration />
      </div>
      <div className="flex shrink-0 flex-col gap-2 pt-2">
        <h1 className="text-2xl font-bold leading-tight text-app-title">
          Selamat datang di <br /> Warga Digital <br /> Sawangan Regensi RT 03
        </h1>
        <p className="text-sm leading-relaxed text-app-body">
          Peran Anda sangat berarti dalam membangun rukun warga yang saling terhubung, produktif, dan berkembang bersama. Mari kita wujudkan lingkungan yang lebih baik, lebih solid, dan lebih sejahtera!
        </p>
      </div>
    </PageScreen>
  );
}

function WelcomeIllustration() {
  return (
    <div className="relative h-[260px] w-full max-w-[260px] rounded-full bg-[var(--color-surface-alt)]">
      <ArrowPathIcon className="absolute left-1/2 top-8 h-14 w-14 -translate-x-1/2 text-emerald-500/80" />
      <HomeModernIcon className="absolute left-1/2 top-[96px] h-16 w-16 -translate-x-1/2 text-emerald-700" />
      <SunIcon className="absolute right-7 top-10 h-8 w-8 text-amber-400" />
      <div className="absolute bottom-8 left-7 h-16 w-20 rounded-full bg-emerald-600/30" />
      <div className="absolute bottom-7 right-8 h-14 w-20 rounded-full bg-emerald-500/25" />
    </div>
  );
}
