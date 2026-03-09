-- Badges: achievement-style icons for gamification (e.g. GitHub-style badges).
-- user_badges links users to badges they have earned.

CREATE TABLE badges (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(50) UNIQUE NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  icon        VARCHAR(20) NOT NULL DEFAULT '🏅',
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_badges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id   INT NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX idx_badges_sort_order ON badges(sort_order);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Badges: no anon access" ON badges FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "User badges: no anon access" ON user_badges FOR ALL TO anon USING (false) WITH CHECK (false);

-- Seed default badges (achievements)
INSERT INTO badges (id, code, name, description, icon, sort_order) VALUES
  (1, 'warga_baru',    'Warga Baru',    'Baru bergabung di lingkungan',           '🌱', 1),
  (2, 'kepala_keluarga','Kepala Keluarga','Menjadi kepala rumah tangga',            '👑', 2),
  (3, 'kontributor_kas','Kontributor Kas','Berkontribusi mencatat kas RT',          '📒', 3),
  (4, 'peduli_lingkungan','Peduli Lingkungan','Aktif dalam kegiatan lingkungan',   '🌿', 4),
  (5, 'warga_aktif',   'Warga Aktif',   'Sudah 30 hari aktif di aplikasi',         '⭐', 5),
  (6, 'pembayar_tepat', 'Pembayar Tepat','Selalu bayar iuran tepat waktu',          '✅', 6),
  (7, 'penggerak_rt',  'Penggerak RT',  'Membantu menggerakkan warga',             '🤝', 7);
