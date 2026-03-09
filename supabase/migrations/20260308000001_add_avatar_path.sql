-- Profile picture: path in storage bucket 'avatars' (e.g. {user_id}/avatar.jpg)
-- Public URL: {SUPABASE_URL}/storage/v1/object/public/avatars/{avatar_path}
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_path TEXT;
COMMENT ON COLUMN users.avatar_path IS 'Path in avatars bucket, e.g. {user_id}/avatar.jpg. Null = use initials.';
