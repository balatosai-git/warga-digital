"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/landing", label: "Beranda", icon: HomeIcon },
  { href: "/dompet", label: "Dompet", icon: DompetIcon },
  { href: "/kas-rt", label: "Kas RT", icon: KasRTIcon },
  { href: "/profil", label: "Profil", icon: ProfilIcon },
] as const;

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function DompetIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 12V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
      <path d="M20 12h-6a2 2 0 1 0 0 4h6" />
      {active && <circle cx="17" cy="14" r="1" fill="currentColor" stroke="none" />}
    </svg>
  );
}

function KasRTIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="10" y1="14" x2="14" y2="14" />
      {active && <circle cx="12" cy="14" r="0.5" fill="currentColor" stroke="none" />}
    </svg>
  );
}

function ProfilIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="flex shrink-0 items-center justify-around border-t border-[var(--color-input-border)] bg-app-surface/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur supports-[backdrop-filter]:bg-app-surface/85"
      aria-label="Navigasi utama"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href === "/landing" && pathname === "/");
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 rounded-xl px-3 py-1 transition-all active:scale-[0.98]"
            aria-current={active ? "page" : undefined}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center transition-colors ${
                active ? "text-app-primary" : "text-app-body-muted"
              }`}
            >
              <Icon active={active} />
            </span>
            <span
              className={`text-[10px] font-medium tracking-[0.01em] transition-colors ${
                active ? "text-app-primary" : "text-app-body-muted"
              }`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
