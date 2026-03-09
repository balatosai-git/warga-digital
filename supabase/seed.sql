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
