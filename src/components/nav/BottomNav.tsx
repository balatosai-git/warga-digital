"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BuildingLibraryIcon,
  Cog6ToothIcon,
  HomeIcon as HomeOutlineIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import {
  BuildingLibraryIcon as BuildingLibrarySolidIcon,
  Cog6ToothIcon as Cog6ToothSolidIcon,
  HomeIcon as HomeSolidIcon,
  UserCircleIcon as UserCircleSolidIcon,
} from "@heroicons/react/24/solid";
import { hasAdminRoleInProfile } from "@/lib/roles";

const BASE_NAV_ITEMS = [
  { href: "/landing", label: "Beranda", icon: HomeIcon },
  { href: "/kas-rt", label: "Kas RT", icon: KasRTIcon },
  { href: "/profil", label: "Profil", icon: ProfilIcon },
] as const;
const ADMIN_NAV_ITEM = {
  href: "/admin",
  label: "Admin",
  icon: AdminIcon,
} as const;

function HomeIcon({ active }: { active: boolean }) {
  const Icon = active ? HomeSolidIcon : HomeOutlineIcon;
  return <Icon className="h-6 w-6" aria-hidden />;
}

function KasRTIcon({ active }: { active: boolean }) {
  const Icon = active ? BuildingLibrarySolidIcon : BuildingLibraryIcon;
  return <Icon className="h-6 w-6" aria-hidden />;
}

function ProfilIcon({ active }: { active: boolean }) {
  const Icon = active ? UserCircleSolidIcon : UserCircleIcon;
  return <Icon className="h-6 w-6" aria-hidden />;
}

function AdminIcon({ active }: { active: boolean }) {
  const Icon = active ? Cog6ToothSolidIcon : Cog6ToothIcon;
  return <Icon className="h-6 w-6" aria-hidden />;
}

const SESSION_KEY = "isAdminRt";

function getSessionAdminRole(): boolean | null {
  try {
    const val = sessionStorage.getItem(SESSION_KEY);
    if (val === null) return null;
    return val === "true";
  } catch {
    return null;
  }
}

function setSessionAdminRole(value: boolean) {
  try {
    sessionStorage.setItem(SESSION_KEY, String(value));
  } catch {
    // sessionStorage not available (e.g. SSR), silently ignore
  }
}

export function BottomNav() {
  const pathname = usePathname();
  const [isAdminRt, setIsAdminRt] = useState<boolean>(() => {
    return getSessionAdminRole() ?? false;
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const result = hasAdminRoleInProfile(data);
        setSessionAdminRole(result);
        setIsAdminRt(result);
      })
      .catch(() => {
        if (!cancelled) {
          // Keep current state on transient errors to avoid flicker/hiding
          // admin menu because of network hiccups.
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const navItems = isAdminRt
    ? [...BASE_NAV_ITEMS, ADMIN_NAV_ITEM]
    : BASE_NAV_ITEMS;

  return (
    <nav
      className="flex shrink-0 items-center justify-around border-t border-[var(--color-input-border)] bg-app-surface/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur supports-[backdrop-filter]:bg-app-surface/85"
      aria-label="Navigasi utama"
    >
      {navItems.map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href || (href === "/landing" && pathname === "/");
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
