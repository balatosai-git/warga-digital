interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = "Memuat..." }: PageLoaderProps) {
  return (
    <main className="flex h-full min-h-0 flex-col items-center justify-center bg-app-surface-alt">
      <div className="flex flex-col items-center gap-6" aria-busy="true" aria-live="polite">
        <div className="relative h-16 w-16">
          <div
            className="absolute inset-0 rounded-full border-2 border-[var(--color-indicator-inactive)] opacity-60"
            aria-hidden
          />
          <div
            className="absolute inset-0 animate-spin rounded-full border-2 border-transparent"
            style={{
              animationDuration: "1.2s",
              borderTopColor: "var(--color-primary)",
              borderRightColor: "var(--color-primary-muted)",
            }}
            aria-hidden
          />
          <div
            className="absolute inset-2 rounded-full border-2 border-transparent"
            style={{
              animation: "spin 0.9s linear infinite reverse",
              borderBottomColor: "var(--color-primary-hover)",
              borderLeftColor: "var(--color-primary)",
            }}
            aria-hidden
          />
        </div>
        <p className="text-sm font-medium text-app-body-muted">{message}</p>
      </div>
    </main>
  );
}
