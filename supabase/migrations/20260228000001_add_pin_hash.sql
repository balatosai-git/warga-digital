-- Add PIN hash column for 4-digit PIN (stored as salt:hash from app using scrypt)
-- Nullable for existing users; new users set PIN after OTP in set-pin flow
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash TEXT;

COMMENT ON COLUMN users.pin_hash IS 'Scrypt hash of 4-digit PIN, format salt_hex:hash_hex. Null until user sets PIN.';
