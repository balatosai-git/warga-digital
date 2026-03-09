-- ─── Seed Marketplace Domains ────────────────────────────────────────────────

INSERT INTO marketplace_domains (id, code, name, description, icon, sort_order) VALUES
  ('d0000000-0000-7000-8000-000000000001'::uuid, 'UMKM', 'UMKM',       'Produk UMKM warga — sembako, makanan, kerajinan', '🛒', 1),
  ('d0000000-0000-7000-8000-000000000002'::uuid, 'JASA', 'Jasa Warga', 'Layanan jasa antar-warga',                         '🔧', 2);

-- ─── Seed UMKM Categories ───────────────────────────────────────────────────

INSERT INTO marketplace_categories (id, domain_id, name, slug, description, icon, sort_order) VALUES
  ('c1000000-0000-7000-8000-000000000001'::uuid, 'd0000000-0000-7000-8000-000000000001'::uuid,
   'Sembako',          'sembako',          'Sembako & kebutuhan sehari-hari', '🛍️', 1),
  ('c1000000-0000-7000-8000-000000000002'::uuid, 'd0000000-0000-7000-8000-000000000001'::uuid,
   'Makanan & Minuman', 'makanan-minuman', 'Makanan, cemilan, minuman',       '🍱', 2),
  ('c1000000-0000-7000-8000-000000000003'::uuid, 'd0000000-0000-7000-8000-000000000001'::uuid,
   'Kerajinan Tangan', 'kerajinan-tangan', 'Hasil kerajinan warga',           '🎨', 3),
  ('c1000000-0000-7000-8000-000000000004'::uuid, 'd0000000-0000-7000-8000-000000000001'::uuid,
   'Sayur & Buah',     'sayur-buah',       'Sayur & buah dari kebun warga',   '🥬', 4);

-- ─── Seed Jasa Categories ───────────────────────────────────────────────────

INSERT INTO marketplace_categories (id, domain_id, name, slug, description, icon, sort_order) VALUES
  ('c2000000-0000-7000-8000-000000000001'::uuid, 'd0000000-0000-7000-8000-000000000002'::uuid,
   'Kelistrikan',   'kelistrikan',   'Perbaikan & instalasi listrik',   '⚡', 1),
  ('c2000000-0000-7000-8000-000000000002'::uuid, 'd0000000-0000-7000-8000-000000000002'::uuid,
   'Jahit',         'jahit',         'Jahit baju, kaos, dll',           '🧵', 2),
  ('c2000000-0000-7000-8000-000000000003'::uuid, 'd0000000-0000-7000-8000-000000000002'::uuid,
   'Antar-Jemput',  'antar-jemput',  'Antar jemput dalam kompleks',     '🚗', 3),
  ('c2000000-0000-7000-8000-000000000004'::uuid, 'd0000000-0000-7000-8000-000000000002'::uuid,
   'Bersih-bersih', 'bersih-bersih', 'Kebersihan rumah & kantor',       '🧹', 4);

-- ─── Seed sample UMKM items (uses placeholder owner from seed data) ─────────
-- owner_user_id is NULL-safe: we use a deterministic UUID that can be updated
-- once real users exist. For now items are DRAFT so they won't appear publicly.

INSERT INTO marketplace_items
  (id, tenant_id, category_id, owner_user_id, owner_display_name, name, slug,
   summary, base_price, discount_percent, currency_code, unit_label,
   stock_qty, is_service, status, published_at)
VALUES
  -- Sembako
  ('e1000000-0000-7000-8000-000000000001'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'c1000000-0000-7000-8000-000000000001'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'Toko Pak Edi', 'Beras Premium 5kg', 'beras-premium-5kg',
   'Beras kualitas premium dari Cianjur', 75000, 0, 'IDR', 'karung',
   50, false, 'ACTIVE', NOW()),

  ('e1000000-0000-7000-8000-000000000002'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'c1000000-0000-7000-8000-000000000001'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'Warung Bu Siti', 'Minyak Goreng 2L', 'minyak-goreng-2l',
   'Minyak goreng kemasan 2 liter', 36000, 5, 'IDR', 'botol',
   30, false, 'ACTIVE', NOW()),

  -- Makanan & Minuman
  ('e1000000-0000-7000-8000-000000000003'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'c1000000-0000-7000-8000-000000000002'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'Dapur Bu Ani', 'Nasi Uduk Komplit', 'nasi-uduk-komplit',
   'Nasi uduk + lauk lengkap, pagi hari', 15000, 0, 'IDR', 'porsi',
   NULL, false, 'ACTIVE', NOW()),

  ('e1000000-0000-7000-8000-000000000004'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'c1000000-0000-7000-8000-000000000002'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'Kue Mba Rina', 'Kue Lapis Legit', 'kue-lapis-legit',
   'Kue lapis legit homemade, loyang kecil', 85000, 10, 'IDR', 'loyang',
   10, false, 'ACTIVE', NOW()),

  -- Kerajinan Tangan
  ('e1000000-0000-7000-8000-000000000005'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'c1000000-0000-7000-8000-000000000003'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'Craft by Dewi', 'Tas Rajut Handmade', 'tas-rajut-handmade',
   'Tas rajut katun warna-warni', 120000, 15, 'IDR', 'pcs',
   5, false, 'ACTIVE', NOW()),

  -- Sayur & Buah
  ('e1000000-0000-7000-8000-000000000006'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'c1000000-0000-7000-8000-000000000004'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'Kebun Pak Agus', 'Paket Sayur Segar', 'paket-sayur-segar',
   'Bayam, kangkung, tomat, cabai — segar dari kebun', 25000, 0, 'IDR', 'paket',
   20, false, 'ACTIVE', NOW());

-- ─── Seed sample Jasa items ─────────────────────────────────────────────────

INSERT INTO marketplace_items
  (id, tenant_id, category_id, owner_user_id, owner_display_name, name, slug,
   summary, base_price, discount_percent, currency_code, unit_label,
   stock_qty, is_service, status, published_at)
VALUES
  -- Kelistrikan
  ('e2000000-0000-7000-8000-000000000001'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'c2000000-0000-7000-8000-000000000001'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'Pak Joko Listrik', 'Perbaikan Instalasi Listrik', 'perbaikan-instalasi-listrik',
   'Pasang baru, tambah daya, perbaikan arus pendek', 150000, 0, 'IDR', 'kunjungan',
   NULL, true, 'ACTIVE', NOW()),

  -- Jahit
  ('e2000000-0000-7000-8000-000000000002'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'c2000000-0000-7000-8000-000000000002'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'Bu Ratna Taylor', 'Jahit & Permak Pakaian', 'jahit-permak-pakaian',
   'Potong, jahit baru, permak celana/baju', 50000, 0, 'IDR', 'item',
   NULL, true, 'ACTIVE', NOW()),

  -- Antar-Jemput
  ('e2000000-0000-7000-8000-000000000003'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'c2000000-0000-7000-8000-000000000003'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'Bang Dedi Ojek', 'Ojek Dalam Kompleks', 'ojek-dalam-kompleks',
   'Antar jemput dalam area Sawangan Regensi', 10000, 0, 'IDR', 'trip',
   NULL, true, 'ACTIVE', NOW()),

  -- Bersih-bersih
  ('e2000000-0000-7000-8000-000000000004'::uuid,
   'a0000000-0000-7000-8000-000000000001'::uuid,
   'c2000000-0000-7000-8000-000000000004'::uuid,
   '00000000-0000-0000-0000-000000000000'::uuid,
   'Tim Bersih Blok A', 'Bersih Rumah & Kantor', 'bersih-rumah-kantor',
   'Deep clean rumah, pembersihan taman, garasi', 200000, 10, 'IDR', 'sesi',
   NULL, true, 'ACTIVE', NOW());
