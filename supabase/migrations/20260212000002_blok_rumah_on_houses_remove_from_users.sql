-- Move blok_rumah from users to houses. One house per (tenant, community, blok_rumah).
-- Seed tenant/community: Sawangan Regensi, RT03.

-- 1. Add blok_rumah to houses (unique per tenant+community)
ALTER TABLE houses ADD COLUMN IF NOT EXISTS blok_rumah VARCHAR(20);
CREATE UNIQUE INDEX IF NOT EXISTS idx_houses_tenant_community_blok
  ON houses (tenant_id, community_id, blok_rumah)
  WHERE blok_rumah IS NOT NULL;

-- 2. Remove blok_rumah from users (data lives in houses + user_houses)
ALTER TABLE users DROP COLUMN IF EXISTS blok_rumah;
