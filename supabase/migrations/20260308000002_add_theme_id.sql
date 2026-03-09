-- User appearance preference: theme id (green, blue, purple, orange, teal, rose). Default green.
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_id VARCHAR(20) NOT NULL DEFAULT 'green';

COMMENT ON COLUMN users.theme_id IS 'App theme/appearance: green, blue, purple, orange, teal, rose.';
