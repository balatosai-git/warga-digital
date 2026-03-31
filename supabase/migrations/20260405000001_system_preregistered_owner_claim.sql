-- =============================================================================
-- System pre-registered owner migration + claim flow
--
-- Goal:
-- 1) Import legacy resident JSON as system pre-registered house owners.
-- 2) Let real registered users automatically replace only system pre-registered
--    owners (never replace real owners).
-- =============================================================================

CREATE TABLE IF NOT EXISTS system_preregistered_house_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  pre_registered_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_row_no INT,
  source_full_name TEXT,
  source_status_rumah TEXT,
  source_keterangan TEXT,
  import_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PRE_REGISTERED'
    CHECK (status IN ('PRE_REGISTERED', 'CLAIMED', 'SKIPPED')),
  claimed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_system_prereg_owner_import_key
  ON system_preregistered_house_owners (import_key);

CREATE UNIQUE INDEX IF NOT EXISTS uq_system_prereg_owner_house_active
  ON system_preregistered_house_owners (tenant_id, house_id)
  WHERE status = 'PRE_REGISTERED';

ALTER TABLE system_preregistered_house_owners ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "System prereg owners: no anon access"
    ON system_preregistered_house_owners FOR ALL TO anon
    USING (false) WITH CHECK (false);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

COMMENT ON TABLE system_preregistered_house_owners IS
  'Tracks system-generated owner placeholders imported from legacy resident data. Used to safely auto-claim ownership when the real resident registers.';

-- -----------------------------------------------------------------------------
-- Import function
-- -----------------------------------------------------------------------------
-- Usage:
--   SELECT import_system_preregistered_residents(
--     $json$<contents of latest_pemilik_dan_rumah.json>$json$::jsonb,
--     'a0000000-0000-7000-8000-000000000001'::uuid,
--     'b0000000-0000-7000-8000-000000000002'::uuid
--   );
--
-- Notes:
-- - Houses are upserted by canonical blok_rumah.
-- - Owners are inserted as system users with username sys_prereg_<blok>.
-- - Vacant rows (keterangan/status contains "kosong" or no name) only upsert houses.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION import_system_preregistered_residents(
  p_payload JSONB,
  p_tenant_id UUID,
  p_community_id UUID
)
RETURNS TABLE(processed_count INT, prereg_owner_count INT, skipped_count INT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_processed INT := 0;
  v_prereg INT := 0;
  v_skipped INT := 0;
BEGIN
  WITH src AS (
    SELECT
      (r->>'no')::INT AS row_no,
      NULLIF(TRIM(COALESCE(r->>'full_name', '')), '') AS full_name,
      UPPER(regexp_replace(COALESCE(r->>'blok_no_rumah', ''), '[^A-Za-z0-9]', '', 'g')) AS blok_key,
      NULLIF(TRIM(COALESCE(r->>'status_rumah', '')), '') AS status_rumah,
      NULLIF(TRIM(COALESCE(r->>'keterangan', '')), '') AS keterangan
    FROM jsonb_array_elements(COALESCE(p_payload->'residents', '[]'::jsonb)) AS r
  ),
  cleaned AS (
    SELECT
      row_no,
      full_name,
      blok_key,
      status_rumah,
      keterangan,
      (
        full_name IS NULL
        OR blok_key = ''
        OR LOWER(COALESCE(keterangan, '')) LIKE '%kosong%'
        OR LOWER(COALESCE(status_rumah, '')) LIKE '%kosong%'
      ) AS is_vacant
    FROM src
    WHERE blok_key <> ''
  ),
  upsert_houses AS (
    INSERT INTO houses (
      id, tenant_id, community_id, name, blok_rumah, status, is_active, total_residents, created_by
    )
    SELECT
      gen_random_uuid(),
      p_tenant_id,
      p_community_id,
      blok_key,
      blok_key,
      CASE
        WHEN LOWER(COALESCE(status_rumah, '')) LIKE '%sewa%' THEN 'KONTRAKAN'::house_status
        WHEN LOWER(COALESCE(status_rumah, '')) LIKE '%pribadi%' THEN 'PRIBADI'::house_status
        ELSE 'PRIBADI'::house_status
      END,
      true,
      0,
      '00000000-0000-0000-0000-000000000000'::uuid
    FROM cleaned
    ON CONFLICT (tenant_id, community_id, blok_rumah) WHERE blok_rumah IS NOT NULL
    DO UPDATE SET
      name = EXCLUDED.name,
      status = EXCLUDED.status,
      is_active = true
    RETURNING id, blok_rumah
  ),
  houses_map AS (
    SELECT h.id AS house_id, h.blok_rumah
    FROM houses h
    WHERE h.tenant_id = p_tenant_id
      AND h.community_id = p_community_id
      AND h.blok_rumah IN (SELECT blok_key FROM cleaned)
  ),
  prereg_candidates AS (
    SELECT
      c.row_no,
      c.full_name,
      c.blok_key,
      c.status_rumah,
      c.keterangan,
      hm.house_id
    FROM cleaned c
    JOIN houses_map hm ON hm.blok_rumah = c.blok_key
    WHERE c.is_vacant = false
  ),
  upsert_users AS (
    INSERT INTO users (id, full_name, username, status, created_by)
    SELECT
      gen_random_uuid(),
      pc.full_name,
      'sys_prereg_' || LOWER(pc.blok_key),
      'INACTIVE'::user_status,
      '00000000-0000-0000-0000-000000000000'::uuid
    FROM prereg_candidates pc
    ON CONFLICT (username) DO UPDATE SET
      full_name = EXCLUDED.full_name
    RETURNING id, username
  ),
  users_map AS (
    SELECT u.id AS user_id, u.username
    FROM users u
    WHERE u.username LIKE 'sys_prereg_%'
      AND u.username IN (
        SELECT 'sys_prereg_' || LOWER(blok_key) FROM prereg_candidates
      )
  ),
  upsert_tenant_users AS (
    INSERT INTO tenant_users (id, tenant_id, user_id, status)
    SELECT gen_random_uuid(), p_tenant_id, um.user_id, 'ACTIVE'::tenant_user_status
    FROM users_map um
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET status = 'ACTIVE'::tenant_user_status
    RETURNING id
  ),
  upsert_owner_links AS (
    INSERT INTO user_houses (id, tenant_id, user_id, house_id, relationship, is_primary, status, created_by)
    SELECT
      gen_random_uuid(),
      p_tenant_id,
      um.user_id,
      pc.house_id,
      'OWNER'::relationship_type,
      true,
      'ACTIVE'::user_house_status,
      '00000000-0000-0000-0000-000000000000'::uuid
    FROM prereg_candidates pc
    JOIN users_map um ON um.username = ('sys_prereg_' || LOWER(pc.blok_key))
    ON CONFLICT DO NOTHING
    RETURNING id
  ),
  upsert_registry AS (
    INSERT INTO system_preregistered_house_owners (
      tenant_id,
      community_id,
      house_id,
      pre_registered_user_id,
      source_row_no,
      source_full_name,
      source_status_rumah,
      source_keterangan,
      import_key,
      status
    )
    SELECT
      p_tenant_id,
      p_community_id,
      pc.house_id,
      um.user_id,
      pc.row_no,
      pc.full_name,
      pc.status_rumah,
      pc.keterangan,
      p_tenant_id::text || ':' || p_community_id::text || ':' || pc.blok_key,
      'PRE_REGISTERED'
    FROM prereg_candidates pc
    JOIN users_map um ON um.username = ('sys_prereg_' || LOWER(pc.blok_key))
    ON CONFLICT (import_key) DO UPDATE SET
      source_row_no = EXCLUDED.source_row_no,
      source_full_name = EXCLUDED.source_full_name,
      source_status_rumah = EXCLUDED.source_status_rumah,
      source_keterangan = EXCLUDED.source_keterangan,
      updated_at = NOW(),
      status = CASE
        WHEN system_preregistered_house_owners.status = 'CLAIMED' THEN 'CLAIMED'
        ELSE 'PRE_REGISTERED'
      END
    RETURNING id
  )
  SELECT
    (SELECT COUNT(*) FROM cleaned),
    (SELECT COUNT(*) FROM prereg_candidates),
    (SELECT COUNT(*) FROM cleaned WHERE is_vacant = true)
  INTO v_processed, v_prereg, v_skipped;

  RETURN QUERY SELECT v_processed, v_prereg, v_skipped;
END;
$$;

-- -----------------------------------------------------------------------------
-- Claim function used by registration flow
-- -----------------------------------------------------------------------------
-- If a house has a system pre-registered owner, replace it with the newly
-- registered real user. Otherwise returns claimed=false and does nothing.
CREATE OR REPLACE FUNCTION claim_system_preregistered_owner(
  p_tenant_id UUID,
  p_house_id UUID,
  p_real_user_id UUID
)
RETURNS TABLE(claimed BOOLEAN, pre_registered_user_id UUID, message TEXT)
LANGUAGE plpgsql
AS $$
DECLARE
  v_prereg RECORD;
BEGIN
  SELECT *
  INTO v_prereg
  FROM system_preregistered_house_owners sp
  WHERE sp.tenant_id = p_tenant_id
    AND sp.house_id = p_house_id
    AND sp.status = 'PRE_REGISTERED'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, 'no_pre_registered_owner';
    RETURN;
  END IF;

  -- Deactivate placeholder owner's active OWNER link for this house
  UPDATE user_houses
  SET status = 'INACTIVE',
      is_primary = false,
      move_out_date = CURRENT_DATE
  WHERE tenant_id = p_tenant_id
    AND house_id = p_house_id
    AND user_id = v_prereg.pre_registered_user_id
    AND relationship = 'OWNER'
    AND status = 'ACTIVE';

  -- Ensure real user is tenant member
  INSERT INTO tenant_users (id, tenant_id, user_id, status)
  VALUES (gen_random_uuid(), p_tenant_id, p_real_user_id, 'ACTIVE')
  ON CONFLICT (tenant_id, user_id) DO UPDATE
    SET status = 'ACTIVE';

  -- Ensure real user has only one active primary house in tenant
  UPDATE user_houses
  SET is_primary = false,
      status = 'INACTIVE',
      move_out_date = CURRENT_DATE
  WHERE tenant_id = p_tenant_id
    AND user_id = p_real_user_id
    AND is_primary = true
    AND status = 'ACTIVE'
    AND house_id <> p_house_id;

  -- Upsert ownership for real user on the claimed house
  UPDATE user_houses
  SET relationship = 'OWNER',
      is_primary = true,
      status = 'ACTIVE'
  WHERE tenant_id = p_tenant_id
    AND user_id = p_real_user_id
    AND house_id = p_house_id;

  IF NOT FOUND THEN
    INSERT INTO user_houses (
      id, tenant_id, user_id, house_id, relationship, is_primary, status, created_by
    )
    VALUES (
      gen_random_uuid(),
      p_tenant_id,
      p_real_user_id,
      p_house_id,
      'OWNER',
      true,
      'ACTIVE',
      p_real_user_id
    );
  END IF;

  -- Mark claim registry
  UPDATE system_preregistered_house_owners
  SET status = 'CLAIMED',
      claimed_by_user_id = p_real_user_id,
      claimed_at = NOW(),
      updated_at = NOW()
  WHERE id = v_prereg.id;

  RETURN QUERY SELECT true, v_prereg.pre_registered_user_id, 'claimed';
END;
$$;
