-- Kas RT: category as free text, single description (details only)
-- Run after 20260307000001 if you have category_id; safe to run on DB that already has description/description removed.

-- Add category as free text (nullable)
ALTER TABLE kas_rt_transactions
  ADD COLUMN IF NOT EXISTS category VARCHAR(255);

-- Migrate existing category_id to category text (if kas_rt_categories exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'kas_rt_categories'
  ) THEN
    UPDATE kas_rt_transactions t
    SET category = c.name
    FROM kas_rt_categories c
    WHERE t.category_id = c.id AND t.category IS NULL;
  END IF;
END $$;

-- Drop category_id column and FK if present
ALTER TABLE kas_rt_transactions
  DROP COLUMN IF EXISTS category_id;

-- Drop description column (keep only details as the single description)
ALTER TABLE kas_rt_transactions
  DROP COLUMN IF EXISTS description;

-- Index for filtering by category (drop old one on category_id if exists, create on category)
DROP INDEX IF EXISTS idx_kas_rt_tx_category;
CREATE INDEX idx_kas_rt_tx_category ON kas_rt_transactions (category);

-- Drop kas_rt_categories table (policies and idx_kas_rt_categories_tenant_community drop with it)
DROP TABLE IF EXISTS kas_rt_categories;
