"use client";

import { NextUIProvider } from "@nextui-org/react";
import { ThemeApplicator } from "@/components/theme-applicator";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextUIProvider>
      <ThemeApplicator />
      {children}
    </NextUIProvider>
  );
}
