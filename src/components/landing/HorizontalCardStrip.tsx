"use client";

import {
  BoltIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  SparklesIcon,
  TruckIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";

export interface HorizontalCardItem {
  id: string;
  imageUrl?: string | null;
  /** Domain/category marker from data source. */
  icon?: string | null;
  title: string;
  description?: string;
}

interface HorizontalCardStripProps {
  title: string;
  items: HorizontalCardItem[];
  viewAllHref?: string;
}

function resolveCategoryIcon(icon: string | null | undefined) {
  switch (icon) {
    case "??":
      return ShoppingCartIcon;
    case "??":
      return WrenchScrewdriverIcon;
    case "???":
      return ShoppingBagIcon;
    case "??":
    case "??":
    case "??":
      return SparklesIcon;
    case "?":
      return BoltIcon;
    case "??":
      return WrenchScrewdriverIcon;
    case "??":
      return TruckIcon;
    case "??":
      return SparklesIcon;
    default:
      return SparklesIcon;
  }
}

function Card({ item }: { item: HorizontalCardItem }) {
  const Icon = resolveCategoryIcon(item.icon);

  return (
    <article className="flex h-full w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-emerald-100/80 bg-app-surface shadow-[0_10px_26px_-18px_rgba(16,24,40,0.45)]">
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
            <span
              className="absolute inset-0 flex items-center justify-center"
              aria-hidden
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-black/5 bg-white text-3xl shadow-[0_6px_18px_-12px_rgba(15,23,42,0.35)]">
                <Icon className="h-8 w-8 text-app-primary" />
              </span>
            </span>
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
          <div className="w-px shrink-0" aria-hidden />
        </div>
      </div>
    </section>
  );
}
