-- Kas RT: remove recorded_by, add reference (block number e.g. N2 for transferer)
ALTER TABLE kas_rt_transactions
  DROP COLUMN IF EXISTS recorded_by;

ALTER TABLE kas_rt_transactions
  ADD COLUMN IF NOT EXISTS reference VARCHAR(50);

COMMENT ON COLUMN kas_rt_transactions.reference IS 'Block/reference of transferer, e.g. N2';
