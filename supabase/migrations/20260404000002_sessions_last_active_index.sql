-- Index to speed up the admin/warga query that fetches the most-recent
-- last_active_at per user from the sessions table.
--
-- Query pattern (from /api/admin/warga):
--   SELECT user_id, last_active_at
--   FROM sessions
--   WHERE user_id = ANY(...)
--   ORDER BY last_active_at DESC;
--
-- The composite index on (user_id, last_active_at DESC) lets Postgres satisfy
-- both the equality filter on user_id and the descending sort on last_active_at
-- with a single index scan — no heap sort needed.

CREATE INDEX IF NOT EXISTS sessions_user_id_last_active_at_idx
  ON sessions (user_id, last_active_at DESC);
