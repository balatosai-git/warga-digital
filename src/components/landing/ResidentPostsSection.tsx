"use client";

import Link from "next/link";

export interface ResidentPostItem {
  id: string;
  title: string;
  excerpt?: string;
  /** Optional image URL; placeholder used if not set */
  imageUrl?: string | null;
  /** Optional author or source label */
  author?: string;
}

interface ResidentPostsSectionProps {
  title: string;
  items: ResidentPostItem[];
  /** Base path for detail links, e.g. "/post" -> /post/[id] */
  detailHref?: (id: string) => string;
}

function PostPlaceholder() {
  return (
    <div
      className="h-full w-full bg-gradient-to-br from-[var(--color-primary-muted)] to-[color:color-mix(in_oklab,var(--color-primary),transparent_80%)]"
      aria-hidden
    >
      <div className="px-6 pt-10">
        <div className="h-3 w-[55%] rounded bg-white/90" />
        <div className="mt-3 h-2 w-[76%] rounded bg-white/60" />
        <div className="mt-2 h-2 w-[64%] rounded bg-white/60" />
      </div>
    </div>
  );
}

function PostCard({ item, href }: { item: ResidentPostItem; href: string }) {
  return (
    <Link
      href={href}
      className="block overflow-hidden rounded-xl bg-app-surface shadow-sm transition-shadow active:opacity-95 hover:shadow-md"
    >
      <article className="flex flex-col">
        {/* Image: ~40% height feel, full width */}
        <div className="relative h-40 w-full shrink-0 overflow-hidden">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <PostPlaceholder />
          )}
        </div>
        <div className="min-w-0 flex-1 px-3 py-2.5">
          <h3 className="truncate text-sm font-semibold text-app-title">
            {item.title}
          </h3>
          {item.excerpt && (
            <p className="mt-0.5 line-clamp-2 text-xs text-app-body-muted">
              {item.excerpt}
            </p>
          )}
          {item.author && (
            <p className="mt-1 truncate text-[10px] text-app-body-muted">
              {item.author}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}

export function ResidentPostsSection({
  title,
  items,
  detailHref = (id) => `#post-${id}`,
}: ResidentPostsSectionProps) {
  return (
    <section
      className="px-4 py-4"
      aria-labelledby="resident-posts-title"
    >
      <h2
        id="resident-posts-title"
        className="mb-3 text-lg font-bold text-app-title"
      >
        {title}
      </h2>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <PostCard
            key={item.id}
            item={item}
            href={detailHref(item.id)}
          />
        ))}
      </div>
    </section>
  );
}
