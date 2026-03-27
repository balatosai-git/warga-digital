-- =============================================================================
-- Kas RT: Structured transaction categories with pre-fill templates
-- Replaces the old kas_rt_categories free-text approach.
-- Each category has a title_template and desc_template that can contain
-- {bulan} and {blok} placeholders resolved on the client at form-fill time.
-- =============================================================================

CREATE TABLE IF NOT EXISTS kas_rt_transaction_categories (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  community_id     UUID         NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name             VARCHAR(100) NOT NULL,
  -- 'income'  = only shown for Pemasukan
  -- 'expense' = only shown for Pengeluaran
  -- 'both'    = shown for both
  applies_to       VARCHAR(10)  NOT NULL DEFAULT 'both'
                     CHECK (applies_to IN ('income', 'expense', 'both')),
  title_template   VARCHAR(255) NOT NULL DEFAULT '',
  desc_template    TEXT         NOT NULL DEFAULT '',
  sort_order       INT          NOT NULL DEFAULT 0,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, community_id, name)
);

CREATE INDEX IF NOT EXISTS idx_kas_rt_tx_categories_tenant_community
  ON kas_rt_transaction_categories (tenant_id, community_id, applies_to, sort_order);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE kas_rt_transaction_categories ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated may read categories
CREATE POLICY "kas_rt_tx_categories_select_all"
  ON kas_rt_transaction_categories
  FOR SELECT
  USING (true);

-- Anonymous users may not write
CREATE POLICY "kas_rt_tx_categories_deny_anon_write"
  ON kas_rt_transaction_categories
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- ─── Default seed categories ──────────────────────────────────────────────────
-- Tenant : Sawangan Regensi  (a0000000-0000-7000-8000-000000000001)
-- Community : RT 03          (b0000000-0000-7000-8000-000000000002)
-- Placeholders: {bulan} = Indonesian month name, {blok} = house/block reference

INSERT INTO kas_rt_transaction_categories
  (tenant_id, community_id, name, applies_to, title_template, desc_template, sort_order)
VALUES

  -- ── Pemasukan (income) ──────────────────────────────────────────────────────
  (
    'a0000000-0000-7000-8000-000000000001'::uuid,
    'b0000000-0000-7000-8000-000000000002'::uuid,
    'IPL',
    'income',
    'IPL Bulan {bulan}',
    'Pembayaran IPL untuk blok {blok} periode {bulan}',
    10
  ),
  (
    'a0000000-0000-7000-8000-000000000001'::uuid,
    'b0000000-0000-7000-8000-000000000002'::uuid,
    'Sumbangan',
    'income',
    'Sumbangan Bulan {bulan}',
    'Sumbangan sukarela dari blok {blok} periode {bulan}',
    20
  ),
  (
    'a0000000-0000-7000-8000-000000000001'::uuid,
    'b0000000-0000-7000-8000-000000000002'::uuid,
    'Denda',
    'income',
    'Denda dari Blok {blok}',
    'Pembayaran denda dari blok {blok}',
    30
  ),
  (
    'a0000000-0000-7000-8000-000000000001'::uuid,
    'b0000000-0000-7000-8000-000000000002'::uuid,
    'Pendapatan Lain',
    'income',
    'Pendapatan Lain-lain Bulan {bulan}',
    'Pendapatan lain-lain periode {bulan}',
    40
  ),

  -- ── Pengeluaran (expense) ───────────────────────────────────────────────────
  (
    'a0000000-0000-7000-8000-000000000001'::uuid,
    'b0000000-0000-7000-8000-000000000002'::uuid,
    'Kebersihan',
    'expense',
    'Biaya Kebersihan {bulan}',
    'Pembayaran petugas kebersihan periode {bulan}',
    10
  ),
  (
    'a0000000-0000-7000-8000-000000000001'::uuid,
    'b0000000-0000-7000-8000-000000000002'::uuid,
    'Keamanan',
    'expense',
    'Biaya Keamanan/Satpam {bulan}',
    'Honorarium satpam/keamanan periode {bulan}',
    20
  ),
  (
    'a0000000-0000-7000-8000-000000000001'::uuid,
    'b0000000-0000-7000-8000-000000000002'::uuid,
    'Operasional',
    'expense',
    'Biaya Operasional {bulan}',
    'Pengeluaran operasional RT periode {bulan}',
    30
  ),
  (
    'a0000000-0000-7000-8000-000000000001'::uuid,
    'b0000000-0000-7000-8000-000000000002'::uuid,
    'Perbaikan & Pemeliharaan',
    'expense',
    'Biaya Perbaikan {bulan}',
    'Biaya perbaikan/pemeliharaan lingkungan RT periode {bulan}',
    40
  ),
  (
    'a0000000-0000-7000-8000-000000000001'::uuid,
    'b0000000-0000-7000-8000-000000000002'::uuid,
    'Pengeluaran Lain',
    'expense',
    'Pengeluaran Lain-lain {bulan}',
    'Pengeluaran lain-lain periode {bulan}',
    50
  )

ON CONFLICT (tenant_id, community_id, name) DO UPDATE SET
  applies_to     = EXCLUDED.applies_to,
  title_template = EXCLUDED.title_template,
  desc_template  = EXCLUDED.desc_template,
  sort_order     = EXCLUDED.sort_order,
  is_active      = EXCLUDED.is_active;
