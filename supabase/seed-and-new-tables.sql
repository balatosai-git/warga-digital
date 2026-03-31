-- =============================================================================
-- CATCH-UP: New Tables + Full Seed Data
-- Run this in Supabase Dashboard → SQL Editor on your existing database.
--
-- This is safe to run even if some seed rows already exist (uses ON CONFLICT).
-- It adds the kas_rt and wallet tables that weren't in the original migrations,
-- then seeds all tables from scratch.
-- =============================================================================


-- =============================================================================
-- PART 1 — NEW ENUMS (skip if already created by run-all-migrations.sql)
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE kas_rt_tx_type AS ENUM ('income', 'expense');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE wallet_tx_type AS ENUM ('income', 'expense');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE wallet_tx_category AS ENUM ('gaji', 'belanja', 'tagihan', 'tabungan', 'transfer', 'lainnya');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('SYSTEM', 'KAS_RT', 'RUMAH', 'ORGANISASI', 'MARKETPLACE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_priority AS ENUM ('LOW', 'NORMAL', 'HIGH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- PART 2 — NEW TABLES
-- =============================================================================

-- Kas RT transactions (single description in details, free-text category)
CREATE TABLE IF NOT EXISTS kas_rt_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE RESTRICT,
  title        VARCHAR(200) NOT NULL,
  amount       NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  type         kas_rt_tx_type NOT NULL,
  date         DATE NOT NULL,
  reference    VARCHAR(50),
  details      TEXT,
  category     VARCHAR(255),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES users(id),
  updated_at   TIMESTAMPTZ,
  updated_by   UUID REFERENCES users(id)
);

-- Kas RT attachments (files in Supabase Storage)
CREATE TABLE IF NOT EXISTS kas_rt_attachments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES kas_rt_transactions(id) ON DELETE CASCADE,
  file_name      VARCHAR(255) NOT NULL,
  storage_path   TEXT NOT NULL,
  mime_type      VARCHAR(100),
  size_bytes     INT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by     UUID REFERENCES users(id)
);

-- Personal wallet transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title      VARCHAR(200) NOT NULL,
  category   wallet_tx_category NOT NULL DEFAULT 'lainnya',
  amount     NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  type       wallet_tx_type NOT NULL,
  date       DATE NOT NULL,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type notification_type NOT NULL DEFAULT 'SYSTEM',
  priority notification_priority NOT NULL DEFAULT 'NORMAL',
  title VARCHAR(160) NOT NULL,
  body TEXT NOT NULL,
  action_url VARCHAR(255),
  entity_table VARCHAR(60),
  entity_id UUID,
  dedupe_key VARCHAR(120),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id)
);

-- Announcements / Info Warga
CREATE TABLE IF NOT EXISTS announcements (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  community_id     UUID         REFERENCES communities(id) ON DELETE SET NULL,
  title            VARCHAR(200) NOT NULL,
  excerpt          TEXT,
  body             TEXT,
  author_label     VARCHAR(150) NOT NULL DEFAULT 'Pengurus RT',
  author_user_id   UUID         REFERENCES users(id) ON DELETE SET NULL,
  is_pinned        BOOLEAN      NOT NULL DEFAULT false,
  published_at     TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  is_active        BOOLEAN      NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_by       UUID         REFERENCES users(id) ON DELETE SET NULL,
  updated_at       TIMESTAMPTZ,
  updated_by       UUID         REFERENCES users(id) ON DELETE SET NULL
);

-- Structured Kas RT categories
CREATE TABLE IF NOT EXISTS kas_rt_transaction_categories (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  community_id     UUID         NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name             VARCHAR(100) NOT NULL,
  applies_to       VARCHAR(10)  NOT NULL DEFAULT 'both'
                     CHECK (applies_to IN ('income', 'expense', 'both')),
  title_template   VARCHAR(255) NOT NULL DEFAULT '',
  desc_template    TEXT         NOT NULL DEFAULT '',
  sort_order       INT          NOT NULL DEFAULT 0,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, community_id, name)
);

-- Kas RT soft delete column
ALTER TABLE kas_rt_transactions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Normalize WA numbers to canonical +62XXXXXXXXXX format
CREATE OR REPLACE FUNCTION _strip_non_digits(v TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT regexp_replace(v, '[^0-9]', '', 'g');
$$;

CREATE OR REPLACE FUNCTION normalize_wa_number(v TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE STRICT AS $$
DECLARE
  digits TEXT;
BEGIN
  digits := _strip_non_digits(v);
  IF digits LIKE '62%' THEN
    RETURN '+' || digits;
  END IF;
  IF digits LIKE '0%' THEN
    RETURN '+62' || substring(digits FROM 2);
  END IF;
  RETURN '+62' || digits;
END;
$$;

UPDATE users
SET wa_number = normalize_wa_number(wa_number),
    updated_at = NOW()
WHERE wa_number IS NOT NULL
  AND wa_number <> normalize_wa_number(wa_number);

UPDATE marketplace_items
SET wa_number = normalize_wa_number(wa_number)
WHERE wa_number IS NOT NULL
  AND wa_number <> normalize_wa_number(wa_number);

DROP FUNCTION IF EXISTS _strip_non_digits(TEXT);

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_wa_number_canonical,
  ADD CONSTRAINT users_wa_number_canonical
    CHECK (wa_number IS NULL OR wa_number ~ '^\+62[0-9]{8,13}$');


-- =============================================================================
-- PART 3 — INDEXES FOR NEW TABLES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_kas_rt_tx_tenant_community
  ON kas_rt_transactions (tenant_id, community_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_kas_rt_tx_type
  ON kas_rt_transactions (type, date DESC);
CREATE INDEX IF NOT EXISTS idx_kas_rt_tx_category
  ON kas_rt_transactions (category);
CREATE INDEX IF NOT EXISTS idx_kas_rt_tx_created_by
  ON kas_rt_transactions (created_by);
CREATE INDEX IF NOT EXISTS idx_kas_rt_attachments_tx
  ON kas_rt_attachments (transaction_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_id
  ON wallet_transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_type
  ON wallet_transactions (user_id, type, date DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_category
  ON wallet_transactions (user_id, category);
CREATE INDEX IF NOT EXISTS sessions_user_id_last_active_at_idx
  ON sessions (user_id, last_active_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS notifications_recipient_dedupe_unique
  ON notifications (recipient_user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON notifications (recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON notifications (recipient_user_id, created_at DESC)
  WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_created
  ON notifications (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_announcements_feed
  ON announcements (tenant_id, is_active, published_at DESC)
  WHERE is_active = true AND published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_announcements_pinned
  ON announcements (tenant_id, is_pinned, published_at DESC)
  WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_announcements_community
  ON announcements (community_id, published_at DESC)
  WHERE community_id IS NOT NULL AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_announcements_author_user
  ON announcements (author_user_id)
  WHERE author_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kas_rt_tx_categories_tenant_community
  ON kas_rt_transaction_categories (tenant_id, community_id, applies_to, sort_order);
CREATE INDEX IF NOT EXISTS idx_kas_rt_transactions_not_deleted
  ON kas_rt_transactions (tenant_id, community_id, date)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_kas_rt_transactions_deleted
  ON kas_rt_transactions (deleted_at)
  WHERE deleted_at IS NOT NULL;


-- =============================================================================
-- PART 4 — RLS FOR NEW TABLES
-- =============================================================================

ALTER TABLE kas_rt_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kas_rt_attachments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE kas_rt_transaction_categories ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Anyone can read kas RT transactions"
    ON kas_rt_transactions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Anon cannot write kas RT transactions"
    ON kas_rt_transactions FOR ALL TO anon USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can read kas RT attachments"
    ON kas_rt_attachments FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Anon cannot write kas RT attachments"
    ON kas_rt_attachments FOR ALL TO anon USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Wallet transactions: no anon access"
    ON wallet_transactions FOR ALL TO anon USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Notifications: no anon access"
    ON notifications FOR ALL TO anon USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Announcements: no anon access"
    ON announcements FOR ALL TO anon USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "kas_rt_tx_categories_select_all"
    ON kas_rt_transaction_categories FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "kas_rt_tx_categories_deny_anon_write"
    ON kas_rt_transaction_categories FOR ALL TO anon USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- PART 5 — SEED DATA (all idempotent via ON CONFLICT DO NOTHING)
-- =============================================================================

-- Tenant
INSERT INTO tenants (id, name, description, type, status)
VALUES (
  'a0000000-0000-7000-8000-000000000001'::uuid,
  'Sawangan Regensi',
  'Ekosistem digital Sawangan Regensi RT 03',
  'PERUMAHAN', 'ACTIVE'
) ON CONFLICT (id) DO NOTHING;

-- Communities
INSERT INTO communities (id, tenant_id, code, name, level, parent_community_id)
VALUES (
  'b0000000-0000-7000-8000-000000000001'::uuid,
  'a0000000-0000-7000-8000-000000000001'::uuid,
  'RW14', 'RW 14', 'RW', NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO communities (id, tenant_id, code, name, level, parent_community_id)
VALUES (
  'b0000000-0000-7000-8000-000000000002'::uuid,
  'a0000000-0000-7000-8000-000000000001'::uuid,
  'RT03', 'RT 03 Sawangan Regensi', 'RT',
  'b0000000-0000-7000-8000-000000000001'::uuid
) ON CONFLICT (id) DO NOTHING;

-- Roles
INSERT INTO roles (id, name, description, scope) VALUES
  (1, 'WARGA',            'Warga biasa',      'TENANT'),
  (2, 'SELLER',           'Penjual',           'TENANT'),
  (3, 'BUYER',            'Pembeli',           'TENANT'),
  (4, 'RT_ADMIN',         'Admin RT',          'TENANT'),
  (5, 'RW_ADMIN',         'Admin RW',          'TENANT'),
  (6, 'KOPERASI_ADMIN',   'Admin Koperasi',    'TENANT'),
  (7, 'PLATFORM_ARBITER', 'Arbiter platform',  'SYSTEM'),
  (8, 'RT_BENDAHARA',     'Bendahara RT (bisa mencatat transaksi kas RT)', 'TENANT')
ON CONFLICT (id) DO NOTHING;

-- Announcements (Info Warga)
INSERT INTO announcements
  (tenant_id, community_id, title, excerpt, author_label, is_pinned, published_at, is_active)
VALUES
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid,
   'Bazar RT 03 - Akhir Pekan Ini',
   'Lokasi lapangan RT. Bawa keluarga, banyak stand makanan dan kerajinan warga.',
   'Pengurus RT 03', true, NOW() - INTERVAL '1 hour', true),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid,
   'Jasa Service AC Blok N',
   'Bersih & isi freon. Hubungi Pak Budi untuk info lebih lanjut.',
   'Blok N', false, NOW() - INTERVAL '2 hours', true),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid,
   'Kumpul Kebersihan Minggu Pagi',
   'Kerja bakti lingkungan. Meet di poskamling pukul 06.00.',
   'Ketua RT', false, NOW() - INTERVAL '3 hours', true),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid,
   'Lelang Barang Bekas Layak Pakai',
   'Meja, kursi, lemari tersedia. Lihat katalog di grup WhatsApp RT.',
   'Warga Blok A', false, NOW() - INTERVAL '5 hours', true)
ON CONFLICT DO NOTHING;

-- Placeholder system user (needed as owner for seed marketplace items)
INSERT INTO users (id, full_name, status)
VALUES ('00000000-0000-0000-0000-000000000000'::uuid, 'System Placeholder', 'INACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Marketplace domains
INSERT INTO marketplace_domains (id, code, name, description, icon, sort_order)
VALUES
  ('d0000000-0000-7000-8000-000000000001'::uuid,
   'UMKM', 'UMKM', 'Produk UMKM warga — sembako, makanan, kerajinan', '🛒', 1),
  ('d0000000-0000-7000-8000-000000000002'::uuid,
   'JASA', 'Jasa Warga', 'Layanan jasa antar-warga', '🔧', 2)
ON CONFLICT (id) DO NOTHING;

-- UMKM categories
INSERT INTO marketplace_categories (id, domain_id, name, slug, description, icon, sort_order)
VALUES
  ('c1000000-0000-7000-8000-000000000001'::uuid,
   'd0000000-0000-7000-8000-000000000001'::uuid,
   'Sembako', 'sembako', 'Sembako & kebutuhan sehari-hari', '🛍️', 1),
  ('c1000000-0000-7000-8000-000000000002'::uuid,
   'd0000000-0000-7000-8000-000000000001'::uuid,
   'Makanan & Minuman', 'makanan-minuman', 'Makanan, cemilan, minuman', '🍱', 2),
  ('c1000000-0000-7000-8000-000000000003'::uuid,
   'd0000000-0000-7000-8000-000000000001'::uuid,
   'Kerajinan Tangan', 'kerajinan-tangan', 'Hasil kerajinan warga', '🎨', 3),
  ('c1000000-0000-7000-8000-000000000004'::uuid,
   'd0000000-0000-7000-8000-000000000001'::uuid,
   'Sayur & Buah', 'sayur-buah', 'Sayur & buah dari kebun warga', '🥬', 4)
ON CONFLICT (id) DO NOTHING;

-- Jasa categories
INSERT INTO marketplace_categories (id, domain_id, name, slug, description, icon, sort_order)
VALUES
  ('c2000000-0000-7000-8000-000000000001'::uuid,
   'd0000000-0000-7000-8000-000000000002'::uuid,
   'Kelistrikan', 'kelistrikan', 'Perbaikan & instalasi listrik', '⚡', 1),
  ('c2000000-0000-7000-8000-000000000002'::uuid,
   'd0000000-0000-7000-8000-000000000002'::uuid,
   'Jahit', 'jahit', 'Jahit baju, kaos, dll', '🧵', 2),
  ('c2000000-0000-7000-8000-000000000003'::uuid,
   'd0000000-0000-7000-8000-000000000002'::uuid,
   'Antar-Jemput', 'antar-jemput', 'Antar jemput dalam kompleks', '🚗', 3),
  ('c2000000-0000-7000-8000-000000000004'::uuid,
   'd0000000-0000-7000-8000-000000000002'::uuid,
   'Bersih-bersih', 'bersih-bersih', 'Kebersihan rumah & kantor', '🧹', 4)
ON CONFLICT (id) DO NOTHING;

-- Sample UMKM items
INSERT INTO marketplace_items
  (id, tenant_id, category_id, owner_user_id, owner_display_name, name, slug,
   summary, base_price, discount_percent, currency_code, unit_label,
   stock_qty, is_service, status, published_at)
VALUES
  ('e1000000-0000-7000-8000-000000000001'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'c1000000-0000-7000-8000-000000000001'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'Toko Pak Edi', 'Beras Premium 5kg', 'beras-premium-5kg',
   'Beras kualitas premium dari Cianjur',
   75000, 0, 'IDR', 'karung', 50, false, 'ACTIVE', NOW()),

  ('e1000000-0000-7000-8000-000000000002'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'c1000000-0000-7000-8000-000000000001'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'Warung Bu Siti', 'Minyak Goreng 2L', 'minyak-goreng-2l',
   'Minyak goreng kemasan 2 liter',
   36000, 5, 'IDR', 'botol', 30, false, 'ACTIVE', NOW()),

  ('e1000000-0000-7000-8000-000000000003'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'c1000000-0000-7000-8000-000000000002'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'Dapur Bu Ani', 'Nasi Uduk Komplit', 'nasi-uduk-komplit',
   'Nasi uduk + lauk lengkap, pagi hari',
   15000, 0, 'IDR', 'porsi', NULL, false, 'ACTIVE', NOW()),

  ('e1000000-0000-7000-8000-000000000004'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'c1000000-0000-7000-8000-000000000002'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'Kue Mba Rina', 'Kue Lapis Legit', 'kue-lapis-legit',
   'Kue lapis legit homemade, loyang kecil',
   85000, 10, 'IDR', 'loyang', 10, false, 'ACTIVE', NOW()),

  ('e1000000-0000-7000-8000-000000000005'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'c1000000-0000-7000-8000-000000000003'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'Craft by Dewi', 'Tas Rajut Handmade', 'tas-rajut-handmade',
   'Tas rajut katun warna-warni',
   120000, 15, 'IDR', 'pcs', 5, false, 'ACTIVE', NOW()),

  ('e1000000-0000-7000-8000-000000000006'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'c1000000-0000-7000-8000-000000000004'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'Kebun Pak Agus', 'Paket Sayur Segar', 'paket-sayur-segar',
   'Bayam, kangkung, tomat, cabai — segar dari kebun',
   25000, 0, 'IDR', 'paket', 20, false, 'ACTIVE', NOW())

ON CONFLICT (id) DO NOTHING;

-- Sample Jasa items
INSERT INTO marketplace_items
  (id, tenant_id, category_id, owner_user_id, owner_display_name, name, slug,
   summary, base_price, discount_percent, currency_code, unit_label,
   stock_qty, is_service, status, published_at)
VALUES
  ('e2000000-0000-7000-8000-000000000001'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'c2000000-0000-7000-8000-000000000001'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'Pak Joko Listrik', 'Perbaikan Instalasi Listrik', 'perbaikan-instalasi-listrik',
   'Pasang baru, tambah daya, perbaikan arus pendek',
   150000, 0, 'IDR', 'kunjungan', NULL, true, 'ACTIVE', NOW()),

  ('e2000000-0000-7000-8000-000000000002'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'c2000000-0000-7000-8000-000000000002'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'Bu Ratna Taylor', 'Jahit & Permak Pakaian', 'jahit-permak-pakaian',
   'Potong, jahit baru, permak celana/baju',
   50000, 0, 'IDR', 'item', NULL, true, 'ACTIVE', NOW()),

  ('e2000000-0000-7000-8000-000000000003'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'c2000000-0000-7000-8000-000000000003'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'Bang Dedi Ojek', 'Ojek Dalam Kompleks', 'ojek-dalam-kompleks',
   'Antar jemput dalam area Sawangan Regensi',
   10000, 0, 'IDR', 'trip', NULL, true, 'ACTIVE', NOW()),

  ('e2000000-0000-7000-8000-000000000004'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'c2000000-0000-7000-8000-000000000004'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'Tim Bersih Blok A', 'Bersih Rumah & Kantor', 'bersih-rumah-kantor',
   'Deep clean rumah, pembersihan taman, garasi',
   200000, 10, 'IDR', 'sesi', NULL, true, 'ACTIVE', NOW())

ON CONFLICT (id) DO NOTHING;

-- Kas RT transaction categories (with pre-fill templates)
INSERT INTO kas_rt_transaction_categories
  (tenant_id, community_id, name, applies_to, title_template, desc_template, sort_order)
VALUES
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'IPL', 'income', 'IPL Bulan {bulan}', 'Pembayaran IPL untuk blok {blok} periode {bulan}', 10),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Sumbangan', 'income', 'Sumbangan Bulan {bulan}', 'Sumbangan sukarela dari blok {blok} periode {bulan}', 20),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Denda', 'income', 'Denda dari Blok {blok}', 'Pembayaran denda dari blok {blok}', 30),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Pendapatan Lain', 'income', 'Pendapatan Lain-lain Bulan {bulan}', 'Pendapatan lain-lain periode {bulan}', 40),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Kebersihan', 'expense', 'Biaya Kebersihan {bulan}', 'Pembayaran petugas kebersihan periode {bulan}', 10),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Keamanan', 'expense', 'Biaya Keamanan/Satpam {bulan}', 'Honorarium satpam/keamanan periode {bulan}', 20),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Operasional', 'expense', 'Biaya Operasional {bulan}', 'Pengeluaran operasional RT periode {bulan}', 30),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Perbaikan & Pemeliharaan', 'expense', 'Biaya Perbaikan {bulan}', 'Biaya perbaikan/pemeliharaan lingkungan RT periode {bulan}', 40),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Pengeluaran Lain', 'expense', 'Pengeluaran Lain-lain {bulan}', 'Pengeluaran lain-lain periode {bulan}', 50)
ON CONFLICT (tenant_id, community_id, name) DO UPDATE SET
  applies_to = EXCLUDED.applies_to,
  title_template = EXCLUDED.title_template,
  desc_template = EXCLUDED.desc_template,
  sort_order = EXCLUDED.sort_order,
  is_active = true;

-- Kas RT transactions (reference = block of transferer; single description in details; free-text category)
INSERT INTO kas_rt_transactions
  (id, tenant_id, community_id, title, amount, type, date, reference, details, category)
VALUES
  ('f1000000-0000-7000-8000-000000000001'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'b0000000-0000-7000-8000-000000000002'::uuid,
   'Iuran Bulanan Warga',
   2200000, 'income', '2026-02-08',
   'A',
   'Penerimaan via transfer kolektif dan cash, sudah direkap per blok. Pembayaran iuran Februari dari 22 KK.',
   'Iuran'),

  ('f1000000-0000-7000-8000-000000000002'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'b0000000-0000-7000-8000-000000000002'::uuid,
   'Perbaikan Lampu Jalan',
   875000, 'expense', '2026-02-12',
   'N',
   'Biaya meliputi pembelian lampu, kabel, dan jasa pemasangan. Penggantian 4 unit lampu area Blok N.',
   'Operasional'),

  ('f1000000-0000-7000-8000-000000000003'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'b0000000-0000-7000-8000-000000000002'::uuid,
   'Donasi Warga Kegiatan 17-an',
   650000, 'income', '2026-02-18',
   'N2',
   'Donasi sukarela dari warga dan sponsor lingkungan sekitar. Donasi awal untuk persiapan lomba warga.',
   'Sumbangan'),

  ('f1000000-0000-7000-8000-000000000004'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'b0000000-0000-7000-8000-000000000002'::uuid,
   'Kebersihan Lingkungan',
   325000, 'expense', '2026-01-24',
   'B',
   'Termasuk konsumsi relawan, sarung tangan, dan kantong sampah. Operasional kerja bakti mingguan.',
   'Kebersihan'),

  ('f1000000-0000-7000-8000-000000000005'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'b0000000-0000-7000-8000-000000000002'::uuid,
   'Sewa Tenda Posyandu',
   450000, 'income', '2026-01-17',
   'N2',
   'Sewa tenda untuk acara warga RW, pembayaran lunas. Kas masuk dari penyewaan fasilitas RT.',
   'Lainnya')

ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- PART 6 — STORAGE BUCKETS
-- (skip silently if they already exist)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('kas-rt-attachments', 'kas-rt-attachments', false,
   10485760,
   ARRAY['image/jpeg','image/png','image/webp','image/heic','application/pdf']),
  ('marketplace-media', 'marketplace-media', true,
   5242880,
   ARRAY['image/jpeg','image/png','image/webp','image/heic']),
  ('avatars', 'avatars', true,
   2097152,
   ARRAY['image/jpeg','image/png','image/webp','image/heic'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies (idempotent via DO blocks)
DO $$ BEGIN
  CREATE POLICY "Public read marketplace media"
    ON storage.objects FOR SELECT USING (bucket_id = 'marketplace-media');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read avatars"
    ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Public read kas RT attachments"
    ON storage.objects FOR SELECT USING (bucket_id = 'kas-rt-attachments');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "No anon uploads"
    ON storage.objects FOR INSERT TO anon WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "No anon deletes"
    ON storage.objects FOR DELETE TO anon USING (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "No anon updates"
    ON storage.objects FOR UPDATE TO anon USING (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
