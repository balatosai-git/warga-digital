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

function PostPlaceholderSvg() {
  return (
    <svg
      className="h-full w-full object-cover"
      viewBox="0 0 400 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient
          id="post-card-bg"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="var(--color-primary-muted)" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <rect width="400" height="160" fill="url(#post-card-bg)" />
      <rect x="24" y="40" width="200" height="12" rx="2" fill="white" fillOpacity="0.9" />
      <rect x="24" y="60" width="280" height="8" rx="2" fill="white" fillOpacity="0.6" />
      <rect x="24" y="74" width="240" height="8" rx="2" fill="white" fillOpacity="0.6" />
    </svg>
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
            <PostPlaceholderSvg />
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
