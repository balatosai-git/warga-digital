"use client";

export interface HorizontalCardItem {
  id: string;
  /** Optional image URL; top 60% of card. Sample SVG used if not provided. */
  imageUrl?: string | null;
  /** Optional emoji/icon; shown centered over the gradient when no image. */
  icon?: string | null;
  title: string;
  description?: string;
}

interface HorizontalCardStripProps {
  title: string;
  items: HorizontalCardItem[];
  /** Optional link for "Lihat semua" */
  viewAllHref?: string;
}

/**
 * Square card: top 60% is image (fixed height, full width); below are title and description with ellipsis truncation.
 * Strip is swipeable horizontally (overflow-x-auto).
 */
function Card({ item }: { item: HorizontalCardItem }) {
  return (
    <article className="flex h-full w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-emerald-100/80 bg-app-surface shadow-[0_10px_26px_-18px_rgba(16,24,40,0.45)]">
      {/* Image area: fixed 60% height, full width */}
      <div className="relative h-[60%] w-full shrink-0 overflow-hidden rounded-t-2xl bg-white">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-white" />
            {item.icon && (
              <span
                className="absolute inset-0 flex items-center justify-center"
                aria-hidden
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full border border-black/5 bg-white text-3xl shadow-[0_6px_18px_-12px_rgba(15,23,42,0.35)]">
                  {item.icon}
                </span>
              </span>
            )}
          </>
        )}
      </div>
      <div className="flex min-w-0 min-h-0 flex-1 flex-col justify-center gap-1 overflow-hidden px-3 py-2.5">
        <h3 className="truncate text-[15px] font-semibold leading-tight text-app-title">
          {item.title}
        </h3>
        {item.description && (
          <p className="truncate text-[12px] text-app-body-muted">
            {item.description}
          </p>
        )}
      </div>
    </article>
  );
}

export function HorizontalCardStrip({
  title,
  items,
  viewAllHref,
}: HorizontalCardStripProps) {
  return (
    <section className="py-4" aria-labelledby={`strip-${title.replace(/\s+/g, "-")}`}>
      <div className="mb-3 flex items-center justify-between px-4">
        <h2
          id={`strip-${title.replace(/\s+/g, "-")}`}
          className="text-lg font-bold text-app-title"
        >
          {title}
        </h2>
        {viewAllHref && (
          <a
            href={viewAllHref}
            className="text-sm font-medium text-app-primary active:opacity-80"
          >
            Lihat semua
          </a>
        )}
      </div>
      <div className="overflow-x-auto overscroll-x-contain scrollbar-none">
        <div className="flex gap-3 px-4">
          {items.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="block h-[160px] w-[160px] shrink-0 transition-all hover:-translate-y-0.5 active:scale-[0.99]"
            >
              <Card item={item} />
            </a>
          ))}
          {/* Spacer so last card isn't flush to edge */}
          <div className="w-px shrink-0" aria-hidden />
        </div>
      </div>
    </section>
  );
}
