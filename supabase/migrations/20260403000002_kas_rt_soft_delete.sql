-- =============================================================================
-- Kas RT: Soft delete support for transactions
-- Adds deleted_at column so records can be logically removed without
-- losing audit history. All reads should filter WHERE deleted_at IS NULL.
-- =============================================================================

ALTER TABLE kas_rt_transactions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Partial index: fast lookups for non-deleted rows (the common case)
CREATE INDEX IF NOT EXISTS idx_kas_rt_transactions_not_deleted
  ON kas_rt_transactions (tenant_id, community_id, date)
  WHERE deleted_at IS NULL;

-- Index for soft-deleted rows (admin audit queries)
CREATE INDEX IF NOT EXISTS idx_kas_rt_transactions_deleted
  ON kas_rt_transactions (deleted_at)
  WHERE deleted_at IS NOT NULL;
