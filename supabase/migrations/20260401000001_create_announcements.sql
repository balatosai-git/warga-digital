-- =============================================================================
-- Announcements (Info Warga / Resident Posts)
--
-- Tenant-scoped community posts shown on the landing page "Info Warga" strip.
-- Replaces the hard-coded RESIDENT_POSTS array in src/app/landing/page.tsx.
--
-- Key design decisions
-- ────────────────────
-- • tenant_id         — multi-tenant, same schema serves every RT/RW.
-- • community_id      — optional: null means visible to the whole tenant;
--                       set to a specific community_id to scope to one RT/RW.
-- • author_label      — free-text display name ("Pengurus RT 03", "Ketua RT").
--                       Decoupled from author_user_id so posts survive account
--                       deletion and can be created by the system.
-- • author_user_id    — nullable FK to users; links to the poster's profile
--                       when the author is a registered community member.
-- • is_pinned         — pinned posts surface first in the client feed.
-- • published_at      — null = draft / not yet shown; set to a future time to
--                       schedule a post; past time = live.
-- • expires_at        — optional hard expiry; once past, the post is hidden
--                       from the feed without being deleted.
-- • is_active         — soft-delete flag; false = archived / removed.
-- =============================================================================

CREATE TABLE announcements (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scoping
  tenant_id        UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  community_id     UUID        REFERENCES communities(id) ON DELETE SET NULL,

  -- Content
  title            VARCHAR(200) NOT NULL,
  excerpt          TEXT,
  body             TEXT,

  -- Authorship
  author_label     VARCHAR(150) NOT NULL DEFAULT 'Pengurus RT',
  author_user_id   UUID        REFERENCES users(id) ON DELETE SET NULL,

  -- Visibility controls
  is_pinned        BOOLEAN     NOT NULL DEFAULT false,
  published_at     TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  is_active        BOOLEAN     NOT NULL DEFAULT true,

  -- Audit
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID        REFERENCES users(id) ON DELETE SET NULL,
  updated_at       TIMESTAMPTZ,
  updated_by       UUID        REFERENCES users(id) ON DELETE SET NULL
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

-- Main feed query: active, published, not expired — ordered newest first
CREATE INDEX idx_announcements_feed
  ON announcements (tenant_id, is_active, published_at DESC)
  WHERE is_active = true AND published_at IS NOT NULL;

-- Pinned-first sorting support
CREATE INDEX idx_announcements_pinned
  ON announcements (tenant_id, is_pinned, published_at DESC)
  WHERE is_active = true;

-- Community-scoped posts
CREATE INDEX idx_announcements_community
  ON announcements (community_id, published_at DESC)
  WHERE community_id IS NOT NULL AND is_active = true;

-- Author user lookup (e.g. "show all posts by this user")
CREATE INDEX idx_announcements_author_user
  ON announcements (author_user_id)
  WHERE author_user_id IS NOT NULL;

-- ─── Row-Level Security ───────────────────────────────────────────────────────

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- Service-role (API routes) bypasses RLS automatically — no policy needed.

-- Deny all anonymous access
CREATE POLICY "Announcements: no anon access"
  ON announcements FOR ALL TO anon
  USING (false)
  WITH CHECK (false);

-- ─── Seed: replace hard-coded RESIDENT_POSTS for the default RT 03 tenant ────
-- These mirror the previous static array in src/app/landing/page.tsx.
-- published_at is set in the past so they appear immediately.
-- author_user_id is intentionally NULL (no real user linked yet).

INSERT INTO announcements
  (tenant_id, community_id, title, excerpt, author_label,
   is_pinned, published_at, is_active)
VALUES
  (
    'a0000000-0000-7000-8000-000000000001'::uuid,
    'b0000000-0000-7000-8000-000000000002'::uuid,
    'Bazar RT 03 - Akhir Pekan Ini',
    'Lokasi lapangan RT. Bawa keluarga, banyak stand makanan dan kerajinan warga.',
    'Pengurus RT 03',
    true,
    NOW() - INTERVAL '1 hour',
    true
  ),
  (
    'a0000000-0000-7000-8000-000000000001'::uuid,
    'b0000000-0000-7000-8000-000000000002'::uuid,
    'Jasa Service AC Blok N',
    'Bersih & isi freon. Hubungi Pak Budi untuk info lebih lanjut.',
    'Blok N',
    false,
    NOW() - INTERVAL '2 hours',
    true
  ),
  (
    'a0000000-0000-7000-8000-000000000001'::uuid,
    'b0000000-0000-7000-8000-000000000002'::uuid,
    'Kumpul Kebersihan Minggu Pagi',
    'Kerja bakti lingkungan. Meet di poskamling pukul 06.00.',
    'Ketua RT',
    false,
    NOW() - INTERVAL '3 hours',
    true
  ),
  (
    'a0000000-0000-7000-8000-000000000001'::uuid,
    'b0000000-0000-7000-8000-000000000002'::uuid,
    'Lelang Barang Bekas Layak Pakai',
    'Meja, kursi, lemari tersedia. Lihat katalog di grup WhatsApp RT.',
    'Warga Blok A',
    false,
    NOW() - INTERVAL '5 hours',
    true
  );
