-- Notification enums
CREATE TYPE notification_type AS ENUM (
  'SYSTEM',
  'KAS_RT',
  'RUMAH',
  'ORGANISASI',
  'MARKETPLACE'
);

CREATE TYPE notification_priority AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- In-app notifications for each user
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type notification_type NOT NULL DEFAULT 'SYSTEM',
  priority notification_priority NOT NULL DEFAULT 'NORMAL',
  title VARCHAR(160) NOT NULL,
  body TEXT NOT NULL,
  action_url VARCHAR(255),
  entity_table VARCHAR(60),
  entity_id UUID,
  dedupe_key VARCHAR(120),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX notifications_recipient_dedupe_unique
  ON notifications (recipient_user_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX idx_notifications_recipient_created
  ON notifications (recipient_user_id, created_at DESC);

CREATE INDEX idx_notifications_recipient_unread
  ON notifications (recipient_user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX idx_notifications_tenant_created
  ON notifications (tenant_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notifications: no anon access"
  ON notifications FOR ALL TO anon USING (false) WITH CHECK (false);
