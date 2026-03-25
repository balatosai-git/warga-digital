"use client";

import { NextUIProvider } from "@nextui-org/react";
import { ThemeApplicator } from "@/components/theme-applicator";
import { AuthInterceptor } from "@/components/auth/AuthInterceptor";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextUIProvider>
      <AuthInterceptor />
      <ThemeApplicator />
      {children}
    </NextUIProvider>
  );
}
