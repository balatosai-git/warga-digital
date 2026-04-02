-- Migration: 20260405000001_notification_indexes.sql
-- Purpose: Add missing indexes to the notifications table for query performance
-- Date: 2026-04-05
--
-- Background:
-- The notification system performs frequent queries filtering by:
--   1. recipient_user_id + created_at (fetching user's notification feed)
--   2. dedupe_key (preventing duplicate notifications)
--   3. type + created_at (filtering by notification type)
--
-- Without proper indexes, these queries require full table scans which
-- degrade performance as the notifications table grows.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Primary feed index: recipient_user_id + created_at DESC
--
-- This is the most critical index. Every time a user opens their notification
-- panel, the API runs:
--   SELECT * FROM notifications
--   WHERE recipient_user_id = $1
--   ORDER BY created_at DESC;
--
-- A composite index on (recipient_user_id, created_at DESC) allows PostgreSQL
-- to satisfy this query with an index-only scan — no table lookup needed.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON notifications (recipient_user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Dedupe key uniqueness constraint
--
-- The dedupe_key column is used to prevent duplicate notification inserts
-- when the same event triggers multiple notification attempts.
--
-- If the UNIQUE constraint already exists (from the original table creation),
-- this statement is a no-op. If it's missing, this adds it.
-- ─────────────────────────────────────────────────────────────────────────────

-- First, check if the constraint already exists to avoid errors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_dedupe_key_key'
      AND conrelid = 'notifications'::regclass
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_dedupe_key_key
      UNIQUE (dedupe_key);
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Partial index for unread notifications
--
-- Many UI components only need to fetch unread notifications:
--   SELECT * FROM notifications
--   WHERE recipient_user_id = $1
--     AND read_at IS NULL
--   ORDER BY created_at DESC;
--
-- A partial index only indexes rows where read_at IS NULL, making it smaller
-- and faster than a full index. As notifications are marked read, they
-- automatically drop out of this index.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_notifications_unread_recipient
  ON notifications (recipient_user_id, created_at DESC)
  WHERE read_at IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Index for notification type filtering
--
-- Used when filtering notifications by type (e.g. KAS_RT, SYSTEM, RUMAH):
--   SELECT * FROM notifications
--   WHERE recipient_user_id = $1
--     AND type = 'KAS_RT'
--   ORDER BY created_at DESC;
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_notifications_type_recipient_created
  ON notifications (type, recipient_user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Index for actor-based lookups (audit trail)
--
-- Used when querying "what notifications did this user trigger?":
--   SELECT * FROM notifications
--   WHERE actor_user_id = $1
--   ORDER BY created_at DESC;
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_notifications_actor_created
  ON notifications (actor_user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Index for tenant-scoped queries
--
-- Some admin queries filter notifications by tenant:
--   SELECT * FROM notifications
--   WHERE tenant_id = $1
--     AND type = 'KAS_RT'
--   ORDER BY created_at DESC;
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_type_created
  ON notifications (tenant_id, type, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification: List all indexes on the notifications table
--
-- Run this query to verify the indexes were created successfully:
--
--   SELECT indexname, indexdef
--   FROM pg_indexes
--   WHERE tablename = 'notifications'
--   ORDER BY indexname;
--
-- Expected output should include:
--   - notifications_pkey (primary key)
--   - notifications_dedupe_key_key (unique constraint)
--   - idx_notifications_recipient_created
--   - idx_notifications_unread_recipient
--   - idx_notifications_type_recipient_created
--   - idx_notifications_actor_created
--   - idx_notifications_tenant_type_created
-- ─────────────────────────────────────────────────────────────────────────────

-- Migration complete
