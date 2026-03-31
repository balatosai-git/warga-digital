-- =============================================================================
-- Seed data for Warga Digital (Supabase)
-- Run with: supabase db seed   (or automatically after supabase db reset)
-- Uses ON CONFLICT so safe to run multiple times.
-- =============================================================================

-- Tenant: Sawangan Regensi RT 03
INSERT INTO tenants (id, name, description, type, status)
VALUES (
  'a0000000-0000-7000-8000-000000000001'::uuid,
  'Sawangan Regensi',
  'Ekosistem digital Sawangan Regensi RT 03',
  'PERUMAHAN',
  'ACTIVE'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  status = EXCLUDED.status;

-- Communities: RW14 (parent), RT03 (child)
INSERT INTO communities (id, tenant_id, code, name, level, parent_community_id)
VALUES (
  'b0000000-0000-7000-8000-000000000001'::uuid,
  'a0000000-0000-7000-8000-000000000001'::uuid,
  'RW14',
  'RW 14',
  'RW',
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  level = EXCLUDED.level,
  parent_community_id = EXCLUDED.parent_community_id;

INSERT INTO communities (id, tenant_id, code, name, level, parent_community_id)
VALUES (
  'b0000000-0000-7000-8000-000000000002'::uuid,
  'a0000000-0000-7000-8000-000000000001'::uuid,
  'RT03',
  'RT 03 Sawangan Regensi',
  'RT',
  'b0000000-0000-7000-8000-000000000001'::uuid
)
ON CONFLICT (id) DO UPDATE SET
  tenant_id = EXCLUDED.tenant_id,
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  level = EXCLUDED.level,
  parent_community_id = EXCLUDED.parent_community_id;

-- Roles (including RT_ADMIN and RT_BENDAHARA for Kas RT transaction submission)
INSERT INTO roles (id, name, description, scope) VALUES
  (1, 'WARGA', 'Warga biasa', 'TENANT'),
  (2, 'SELLER', 'Penjual', 'TENANT'),
  (3, 'BUYER', 'Pembeli', 'TENANT'),
  (4, 'RT_ADMIN', 'Admin RT', 'TENANT'),
  (5, 'RW_ADMIN', 'Admin RW', 'TENANT'),
  (6, 'KOPERASI_ADMIN', 'Admin Koperasi', 'TENANT'),
  (7, 'PLATFORM_ARBITER', 'Arbiter platform', 'SYSTEM'),
  (8, 'RT_BENDAHARA', 'Bendahara RT (bisa mencatat transaksi kas RT)', 'TENANT')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  scope = EXCLUDED.scope;

-- To give a user permission to submit Kas RT transactions, assign RT_ADMIN (4) or RT_BENDAHARA (8):
-- 1. Get the user's id from auth.users or your users table.
-- 2. Get or create their tenant_users row for the default tenant.
-- 3. Insert into tenant_user_roles, e.g.:
--
--    INSERT INTO tenant_user_roles (tenant_user_id, role_id)
--    SELECT tu.id, 8
--    FROM tenant_users tu
--    JOIN users u ON u.id = tu.user_id
--    WHERE tu.tenant_id = 'a0000000-0000-7000-8000-000000000001'
--      AND u.id = '<user_uuid>'
--    ON CONFLICT DO NOTHING;
--
-- (Use role_id 4 for RT_ADMIN or 8 for RT_BENDAHARA.)

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

-- Kas RT transaction categories (template-based)
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
