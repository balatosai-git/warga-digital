"use client";

/**
 * Onboarding screen props and shared UI. Prefer importing from @/components/ui
 * for new code; these re-exports keep onboarding screens aligned with the app design system.
 */

import {
  PrimaryButton,
  SecondaryButton,
  DotIndicators,
} from "@/components/ui";

export interface OnboardingScreenProps {
  onNext?: () => void;
  onPrev?: () => void;
  onSkip?: () => void;
  currentIndex: number;
  totalScreens: number;
}

export { DotIndicators as DashIndicators, PrimaryButton as OnboardingButton };

export function SkipButton({
  onSkip,
}: {
  onSkip?: () => void;
}) {
  if (!onSkip) return null;
  return (
    <SecondaryButton onClick={onSkip}>Skip</SecondaryButton>
  );
}
