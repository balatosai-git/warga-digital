"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/nav/BottomNav";

const BOTTOM_NAV_ROUTES = ["/landing", "/organisasi", "/dompet", "/kas-rt", "/profil", "/admin"];

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const showBottomNav = BOTTOM_NAV_ROUTES.some((route) => pathname === route || pathname?.startsWith(route + "/"));

  return (
    <div className="flex min-h-[var(--app-height,100dvh)] w-full justify-center bg-app-surface-alt/80">
      <div className="relative flex h-[var(--app-height,100dvh)] w-full max-w-[430px] flex-col overflow-hidden border-x border-[var(--color-input-border)] bg-background shadow-[0_12px_40px_-24px_rgba(16,24,40,0.35)]">
        <div
          className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-none pt-[env(safe-area-inset-top)] ${
            showBottomNav ? "pb-2" : "pb-[env(safe-area-inset-bottom)]"
          }`}
        >
          {children}
        </div>
        {showBottomNav && <BottomNav />}
      </div>
    </div>
  );
}
