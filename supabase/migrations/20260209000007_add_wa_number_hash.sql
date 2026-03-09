-- Add wa_number_hash for lookup (wa_number is encrypted, cannot query directly)
ALTER TABLE users ADD COLUMN IF NOT EXISTS wa_number_hash VARCHAR(64) UNIQUE;
CREATE INDEX IF NOT EXISTS idx_users_wa_number_hash ON users(wa_number_hash);
