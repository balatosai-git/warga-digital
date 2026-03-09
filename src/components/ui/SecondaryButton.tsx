"use client";

interface SecondaryButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}

/**
 * Secondary action – pill style, muted. Use for Skip, Batal, Kirim ulang (ghost).
 * Matches app design system (neutral gray).
 */
export function SecondaryButton({
  children,
  onClick,
  type = "button",
  disabled,
  className = "",
}: SecondaryButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border border-emerald-100 bg-emerald-50/70 px-5 py-2 text-sm font-medium text-emerald-700 shadow-sm shadow-emerald-100/50 hover:-translate-y-[1px] hover:bg-emerald-100/70 active:translate-y-0 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}
