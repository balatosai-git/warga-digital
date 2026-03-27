-- Restore KOPERASI_ADMIN role (id 6) which was inadvertently deleted from the live DB.
-- The original seed (20260209000006_seed_default_data.sql) inserted this role, but it was
-- removed at some point after initial seeding. This migration re-inserts it safely.
--
-- ON CONFLICT (id) ensures this is idempotent: re-running on a DB that still has the row
-- will simply update the name/description/scope to the canonical values.

INSERT INTO roles (id, name, description, scope)
VALUES (6, 'KOPERASI_ADMIN', 'Admin Koperasi', 'TENANT')
ON CONFLICT (id) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      scope       = EXCLUDED.scope;
