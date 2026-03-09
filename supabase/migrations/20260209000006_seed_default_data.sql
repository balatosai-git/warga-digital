-- Seed default tenant: Sawangan Regensi RT 03
INSERT INTO tenants (id, name, description, type, status)
VALUES (
  'a0000000-0000-7000-8000-000000000001'::uuid,
  'Sawangan Regensi',
  'Ekosistem digital Sawangan Regensi RT 03',
  'PERUMAHAN',
  'ACTIVE'
);

-- Seed default communities (RT03 under RW hierarchy)
-- RW level first (parent)
INSERT INTO communities (id, tenant_id, code, name, level, parent_community_id)
VALUES (
  'b0000000-0000-7000-8000-000000000001'::uuid,
  'a0000000-0000-7000-8000-000000000001'::uuid,
  'RW14',
  'RW 14',
  'RW',
  NULL
);

-- RT03 as child of RW14
INSERT INTO communities (id, tenant_id, code, name, level, parent_community_id)
VALUES (
  'b0000000-0000-7000-8000-000000000002'::uuid,
  'a0000000-0000-7000-8000-000000000001'::uuid,
  'RT03',
  'RT 03 Sawangan Regensi',
  'RT',
  'b0000000-0000-7000-8000-000000000001'::uuid
);

-- Seed default roles
INSERT INTO roles (id, name, description, scope) VALUES
  (1, 'WARGA', 'Warga biasa', 'TENANT'),
  (2, 'SELLER', 'Penjual', 'TENANT'),
  (3, 'BUYER', 'Pembeli', 'TENANT'),
  (4, 'RT_ADMIN', 'Admin RT', 'TENANT'),
  (5, 'RW_ADMIN', 'Admin RW', 'TENANT'),
  (6, 'KOPERASI_ADMIN', 'Admin Koperasi', 'TENANT'),
  (7, 'PLATFORM_ARBITER', 'Arbiter platform', 'SYSTEM'),
  (8, 'RT_BENDAHARA', 'Bendahara RT (bisa mencatat transaksi kas RT)', 'TENANT');
