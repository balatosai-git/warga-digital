"use client";

interface PageScreenProps {
  children: React.ReactNode;
  /** Optional: top bar (e.g. Skip, or brand label) */
  header?: React.ReactNode;
  /** Optional: sticky bottom block (e.g. indicators + CTA) */
  footer?: React.ReactNode;
  /** Extra class for the root */
  className?: string;
}

/**
 * Full-height screen layout: header (shrink-0), scrollable main (flex-1 min-h-0), footer (shrink-0).
 * Uses safe-area insets. Use for onboarding slides, auth screens, etc. so layout is consistent.
 */
export function PageScreen({
  children,
  header,
  footer,
  className = "",
}: PageScreenProps) {
  return (
    <div
      className={`flex h-full w-full min-h-0 flex-col bg-app-surface px-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] ${className}`}
    >
      {header != null && (
        <div className="flex shrink-0 items-center py-2">{header}</div>
      )}
      <div className="flex min-h-0 flex-1 flex-col justify-center py-2">
        {children}
      </div>
      {footer != null && (
        <div className="flex shrink-0 flex-col gap-4 pt-4">{footer}</div>
      )}
    </div>
  );
}
