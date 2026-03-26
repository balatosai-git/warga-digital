import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { createServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_COMMUNITY_ID,
} from "@/lib/constants/seed-ids";

/** Shape returned for each announcement item in the feed. */
export interface AnnouncementItem {
  id: string;
  title: string;
  excerpt: string | null;
  authorLabel: string;
  isPinned: boolean;
  publishedAt: string;
}

/** Shape of the full GET response. */
export interface AnnouncementsResponse {
  announcements: AnnouncementItem[];
}

/**
 * GET /api/announcements
 *
 * Returns active, published announcements for the default tenant / community,
 * ordered pinned-first then newest-first. Expired posts are excluded.
 *
 * Requires an authenticated session — the landing page (Info Warga strip) is
 * only visible to logged-in residents, so unauthenticated callers receive 401.
 *
 * Query parameters
 * ─────────────────
 * limit   — max items to return (default 20, max 50)
 * offset  — pagination offset (default 0)
 */
export async function GET(request: Request) {
  /* ── 1. Auth ──────────────────────────────────────────────────── */
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* ── 2. Parse query params ────────────────────────────────────── */
  const { searchParams } = new URL(request.url);
  const rawLimit = parseInt(searchParams.get("limit") ?? "20", 10);
  const rawOffset = parseInt(searchParams.get("offset") ?? "0", 10);
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 20, 1), 50);
  const offset = Math.max(Number.isFinite(rawOffset) ? rawOffset : 0, 0);

  /* ── 3. Query ─────────────────────────────────────────────────── */
  const supabase = createServerClient();
  const nowIso = new Date().toISOString();

  /*
   * Fetch announcements that:
   *   • belong to the default tenant
   *   • are scoped to the default community OR have no community scope (tenant-wide)
   *   • are active (not soft-deleted)
   *   • have been published (published_at is in the past)
   *   • have not yet expired (expires_at is null OR still in the future)
   *
   * Ordering: pinned posts first, then newest published_at.
   */
  const { data, error } = await supabase
    .from("announcements")
    .select(
      "id, title, excerpt, author_label, is_pinned, published_at"
    )
    .eq("tenant_id", DEFAULT_TENANT_ID)
    .eq("is_active", true)
    .lte("published_at", nowIso)
    .or(`community_id.is.null,community_id.eq.${DEFAULT_COMMUNITY_ID}`)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order("is_pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("[Announcements GET] Supabase error:", error);
    return NextResponse.json(
      { error: "Gagal memuat pengumuman" },
      { status: 500 }
    );
  }

  /* ── 4. Shape the response ────────────────────────────────────── */
  const announcements: AnnouncementItem[] = (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    excerpt: row.excerpt ?? null,
    authorLabel: row.author_label ?? "Pengurus RT",
    isPinned: row.is_pinned ?? false,
    publishedAt: row.published_at,
  }));

  const response: AnnouncementsResponse = { announcements };
  return NextResponse.json(response);
}
