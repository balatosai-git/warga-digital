"use client";

import { Avatar } from "@/components/ui";

interface LandingHeaderProps {
  /** User display name */
  name?: string;
  /** Profile picture URL; when null/undefined, shows initials (MS Teams style) */
  profilePictureUrl?: string | null;
  /** Blok / rumah label, e.g. "Blok A - 12" */
  blokRumah?: string;
  /** Balance to show, e.g. "Rp 0" or formatted saldo */
  saldo?: string;
  onNotificationPress?: () => void;
  onMenuPress?: () => void;
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

export function LandingHeader({
  name = "Warga",
  profilePictureUrl,
  blokRumah = "Blok —",
  saldo = "Rp 0",
  onNotificationPress,
  onMenuPress,
}: LandingHeaderProps) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 bg-app-surface px-4 py-3 shadow-sm">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={name} src={profilePictureUrl} size={40} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-app-title">{name}</p>
          <p className="truncate text-xs text-app-body-muted">{blokRumah}</p>
          <p className="mt-0.5 text-sm font-semibold text-app-primary">{saldo}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onNotificationPress}
          className="flex h-10 w-10 items-center justify-center rounded-full text-app-body-muted transition-colors hover:bg-app-primary-muted hover:text-app-primary active:opacity-80"
          aria-label="Notifikasi"
        >
          <BellIcon className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={onMenuPress}
          className="flex h-10 w-10 items-center justify-center rounded-full text-app-body-muted transition-colors hover:bg-app-primary-muted hover:text-app-primary active:opacity-80"
          aria-label="Menu"
        >
          <MenuIcon className="h-6 w-6" />
        </button>
      </div>
    </header>
  );
}
