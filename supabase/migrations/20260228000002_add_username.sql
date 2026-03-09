-- Username: optional login alternative when user doesn't have WhatsApp (unique, case-insensitive lookup)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username)) WHERE username IS NOT NULL;

COMMENT ON COLUMN users.username IS 'Optional; used for login when user has no WhatsApp. Stored as-is; lookup by LOWER(username).';

-- RPC for case-insensitive username lookup at login (used when login is not a phone number)
CREATE OR REPLACE FUNCTION get_user_by_username_lower(login_input TEXT)
RETURNS TABLE(id UUID, full_name VARCHAR(150), pin_hash TEXT, status user_status) AS $$
  SELECT u.id, u.full_name, u.pin_hash, u.status
  FROM users u
  WHERE u.username IS NOT NULL AND LOWER(TRIM(u.username)) = LOWER(TRIM(login_input));
$$ LANGUAGE sql STABLE;
