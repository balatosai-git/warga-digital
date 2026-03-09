"use client";

import { Button } from "@nextui-org/react";

interface PrimaryButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  type?: "button" | "submit";
  isLoading?: boolean;
  isDisabled?: boolean;
  className?: string;
}

/**
 * Primary CTA – green, full-width friendly. Use for main actions (e.g. Berikutnya, Mulai, Lanjutkan, Verifikasi).
 * Uses app design token --color-primary.
 */
export function PrimaryButton({
  children,
  onPress,
  type = "button",
  isLoading,
  isDisabled,
  className = "",
}: PrimaryButtonProps) {
  return (
    <Button
      type={type}
      size="lg"
      className={`w-full rounded-2xl bg-app-primary py-7 text-base font-semibold text-white hover:-translate-y-[1px] hover:bg-app-primary-hover active:translate-y-0 focus-visible:ring-2 focus-visible:ring-app-primary/30 focus-visible:ring-offset-2 ${className}`}
      style={{ boxShadow: "0 8px 22px -12px var(--color-primary-shadow)" }}
      onPress={onPress}
      isLoading={isLoading}
      isDisabled={isDisabled}
    >
      {children}
    </Button>
  );
}
