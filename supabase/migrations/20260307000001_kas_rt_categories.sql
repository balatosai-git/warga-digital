-- Kas RT transaction categories (tags) — filterable and shown in list
CREATE TABLE kas_rt_categories (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kas_rt_categories_tenant_community
  ON kas_rt_categories (tenant_id, community_id);

ALTER TABLE kas_rt_transactions
  ADD COLUMN category_id UUID REFERENCES kas_rt_categories(id) ON DELETE SET NULL;

CREATE INDEX idx_kas_rt_tx_category ON kas_rt_transactions (category_id);

ALTER TABLE kas_rt_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read kas RT categories"
  ON kas_rt_categories FOR SELECT USING (true);

CREATE POLICY "Anon cannot write kas RT categories"
  ON kas_rt_categories FOR ALL TO anon USING (false) WITH CHECK (false);

-- Seed default categories for existing tenant/community (run after seed data exists)
-- Insert is idempotent per (tenant_id, community_id, name) if you add a unique constraint;
-- for simplicity we just insert defaults (caller must ensure tenant/community exist).
-- Use seed-and-new-tables or run-all-migrations to insert defaults.
