-- Store WhatsApp as plain text; ensure unique lookup by wa_number.
-- wa_number is no longer encrypted; wa_number_hash is deprecated for user lookup.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wa_number_unique ON users(wa_number) WHERE wa_number IS NOT NULL;
