-- =============================================================================
-- Migration: Normalize wa_number to canonical +62XXXXXXXXXX format
--
-- Before this migration, wa_number values may have been stored in several
-- formats depending on what the user typed at registration time:
--
--   081280031995     → +6281280031995   (leading-zero Indonesian format)
--   6281280031995    → +6281280031995   (country code, no plus sign)
--   +6281280031995   → +6281280031995   (already canonical – no-op)
--   81280031995      → +6281280031995   (bare local number, no prefix)
--
-- After this migration every non-NULL wa_number will begin with "+62".
-- The unique index on wa_number (idx_users_wa_number_unique) ensures that
-- no two rows can end up with the same canonical value; if a conflict is
-- found the UPDATE will fail and must be resolved manually before re-running.
-- =============================================================================

-- Helper: strip all non-digit characters from a text value.
CREATE OR REPLACE FUNCTION _strip_non_digits(v TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT regexp_replace(v, '[^0-9]', '', 'g');
$$;

-- Helper: convert any common Indonesian WA-number format to +62XXXXXXXXXX.
CREATE OR REPLACE FUNCTION normalize_wa_number(v TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE STRICT AS $$
DECLARE
  digits TEXT;
BEGIN
  digits := _strip_non_digits(v);

  -- Already has country code with leading "62"
  IF digits LIKE '62%' THEN
    RETURN '+' || digits;
  END IF;

  -- Indonesian local format with leading zero  "08..."
  IF digits LIKE '0%' THEN
    RETURN '+62' || substring(digits FROM 2);
  END IF;

  -- Bare local number "8..." (no prefix at all)
  RETURN '+62' || digits;
END;
$$;

-- ─── Apply normalization to the users table ───────────────────────────────────

-- Show how many rows will be affected (informational – not a hard requirement)
DO $$
DECLARE
  affected INT;
BEGIN
  SELECT COUNT(*) INTO affected
  FROM users
  WHERE wa_number IS NOT NULL
    AND wa_number <> normalize_wa_number(wa_number);

  RAISE NOTICE 'normalize_wa_number: % row(s) need updating in users.wa_number', affected;
END;
$$;

-- Perform the normalization update.
-- Only touch rows whose stored value differs from the canonical form so that
-- unchanged rows are not needlessly written (avoids unnecessary WAL churn).
UPDATE users
SET    wa_number  = normalize_wa_number(wa_number),
       updated_at = NOW()
WHERE  wa_number IS NOT NULL
  AND  wa_number <> normalize_wa_number(wa_number);

-- ─── Apply the same fix to any other tables that store wa_number ──────────────
-- (marketplace catalog listings have their own wa_number column)
UPDATE marketplace_items
SET    wa_number = normalize_wa_number(wa_number)
WHERE  wa_number IS NOT NULL
  AND  wa_number <> normalize_wa_number(wa_number);

-- ─── Clean up helpers ─────────────────────────────────────────────────────────
-- Keep normalize_wa_number around – it is useful for ad-hoc queries.
-- Drop the private helper once we are done.
DROP FUNCTION IF EXISTS _strip_non_digits(TEXT);

-- ─── Add a DB-level constraint so future inserts/updates stay canonical ───────
-- This CHECK fires only for new writes; existing rows are already normalized.
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_wa_number_canonical,
  ADD  CONSTRAINT users_wa_number_canonical
       CHECK (wa_number IS NULL OR wa_number ~ '^\+62[0-9]{8,13}$');

-- Verify: no remaining non-canonical values
DO $$
DECLARE
  bad INT;
BEGIN
  SELECT COUNT(*) INTO bad
  FROM users
  WHERE wa_number IS NOT NULL
    AND wa_number NOT LIKE '+62%';

  IF bad > 0 THEN
    RAISE EXCEPTION
      'normalize_wa_number: % row(s) still have non-canonical wa_number after migration – investigate before proceeding.',
      bad;
  END IF;

  RAISE NOTICE 'normalize_wa_number: all wa_number values are now in +62... format.';
END;
$$;
