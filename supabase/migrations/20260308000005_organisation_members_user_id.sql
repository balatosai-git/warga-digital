-- Link organisation_members to users (nullable = Vacant slot).
-- When user_id IS NULL, the slot is "Vacant"; when set, it's a registered community user.

ALTER TABLE organisation_members
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_organisation_members_user_id
  ON organisation_members(user_id);

COMMENT ON COLUMN organisation_members.user_id IS 'Registered user in this tenant; NULL = Vacant (role exists but no assignee).';
