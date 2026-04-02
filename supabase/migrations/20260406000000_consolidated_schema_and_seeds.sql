-- =============================================================================
-- WARGA DIGITAL — Consolidated Database Schema & Seeds
-- Version: v0.2.0
-- Created: 2026-04-06
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New query → Paste entire file → Run
--
-- This is the SINGLE SOURCE OF TRUTH for the database schema.
-- Run once on a fresh database. All previous migrations are superseded.
--
-- Sections:
--   1.  Extensions
--   2.  Enums
--   3.  Core Tables
--   4.  Auth Tables
--   5.  Marketplace Tables
--   6.  Kas RT Tables
--   7.  Notifications & Announcements
--   8.  Organisation Tables
--   9.  Badges Tables
--   10. House Join Requests
--   11. System Preregistered Owners
--   12. Indexes
--   13. RLS Policies
--   14. Functions
--   15. Seed Data
-- =============================================================================


-- =============================================================================
-- 1. EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
-- 2. ENUMS
-- =============================================================================

-- Tenant enums
CREATE TYPE tenant_status AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
CREATE TYPE tenant_type AS ENUM ('PERUMAHAN', 'DESA', 'KOPERASI');

-- Community enums
CREATE TYPE community_level AS ENUM ('RT', 'RW', 'OTHER');

-- House enums
CREATE TYPE house_status AS ENUM ('PRIBADI', 'KONTRAKAN', 'KANTOR');

-- User enums
CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'BANNED');

-- Tenant user enums
CREATE TYPE tenant_user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');

-- User house enums
CREATE TYPE relationship_type AS ENUM ('OWNER', 'FAMILY', 'TENANT', 'CARETAKER');
CREATE TYPE user_house_status AS ENUM ('ACTIVE', 'INACTIVE');

-- Role enums
CREATE TYPE role_scope AS ENUM ('SYSTEM', 'TENANT', 'HOUSE');

-- Authority enums
CREATE TYPE authority_type AS ENUM ('RT', 'RW', 'DKM', 'KOPERASI', 'SATPAM');
CREATE TYPE authority_status AS ENUM ('ACTIVE', 'REVOKED');

-- Verification enums
CREATE TYPE entity_type AS ENUM ('USER', 'HOUSE', 'USER_HOUSE');
CREATE TYPE verification_status AS ENUM ('VERIFIED', 'REVOKED');

-- Kas RT enums
CREATE TYPE kas_rt_tx_type AS ENUM ('PEMASUKAN', 'PENGELUARAN');

-- House join request enums
CREATE TYPE house_join_request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Notification enums
CREATE TYPE notification_type AS ENUM ('SYSTEM', 'KAS_RT', 'RUMAH', 'ORGANISASI', 'MARKETPLACE');
CREATE TYPE notification_priority AS ENUM ('LOW', 'NORMAL', 'HIGH');

-- Marketplace enums
CREATE TYPE marketplace_domain_code AS ENUM ('UMKM', 'JASA');
CREATE TYPE marketplace_item_status AS ENUM ('DRAFT', 'ACTIVE', 'SOLD_OUT', 'ARCHIVED');
CREATE TYPE marketplace_tx_status AS ENUM ('PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED');
CREATE TYPE marketplace_payment_status AS ENUM ('UNPAID', 'PAID', 'FAILED', 'REFUNDED');
CREATE TYPE marketplace_tx_event_type AS ENUM ('CREATED', 'CONFIRMED', 'PAID', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUND_REQUESTED', 'REFUNDED');


-- =============================================================================
-- 3. CORE TABLES
-- =============================================================================

-- Users (global human identity)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  wa_number TEXT,
  wa_verified_at TIMESTAMPTZ,
  email VARCHAR(150) UNIQUE,
  date_of_birth DATE,
  status user_status NOT NULL DEFAULT 'INACTIVE',
  pin_hash TEXT,
  username VARCHAR(50) UNIQUE,
  avatar_path TEXT,
  theme_id VARCHAR(20) NOT NULL DEFAULT 'green',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id)
);

COMMENT ON COLUMN users.pin_hash IS 'Scrypt hash of 4-digit PIN, format salt_hex:hash_hex. Null until user sets PIN.';
COMMENT ON COLUMN users.username IS 'Optional; used for login when user has no WhatsApp. Stored as-is; lookup by LOWER(username).';
COMMENT ON COLUMN users.avatar_path IS 'Path in avatars bucket, e.g. {user_id}/avatar.jpg. Null = use initials.';
COMMENT ON COLUMN users.theme_id IS 'App theme/appearance: green, blue, purple, orange, teal, rose.';

-- Tenants
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  description VARCHAR(255),
  type tenant_type NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  status tenant_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id)
);

-- Communities (tenant-local hierarchy)
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150),
  level community_level NOT NULL DEFAULT 'OTHER',
  parent_community_id UUID REFERENCES communities(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id),
  UNIQUE (tenant_id, code)
);

-- Houses
CREATE TABLE houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE RESTRICT,
  name VARCHAR(100) NOT NULL,
  blok_rumah VARCHAR(20),
  address VARCHAR(255),
  total_residents INT DEFAULT 0,
  status house_status NOT NULL DEFAULT 'PRIBADI',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX idx_houses_tenant_community_blok
  ON houses (tenant_id, community_id, blok_rumah)
  WHERE blok_rumah IS NOT NULL;

-- Tenant users
CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status tenant_user_status NOT NULL DEFAULT 'ACTIVE',
  reputation_points INT DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  UNIQUE (tenant_id, user_id)
);

-- User houses
CREATE TABLE user_houses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  relationship relationship_type NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  move_in_date DATE,
  move_out_date DATE,
  status user_house_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE UNIQUE INDEX user_houses_one_primary_per_tenant_user
  ON user_houses (tenant_id, user_id)
  WHERE is_primary = true AND status = 'ACTIVE';

-- Roles (pure RBAC)
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(255),
  scope role_scope NOT NULL DEFAULT 'TENANT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id)
);

-- Tenant user roles
CREATE TABLE tenant_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_user_id UUID NOT NULL REFERENCES tenant_users(id) ON DELETE CASCADE,
  role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX tenant_user_roles_active_unique
  ON tenant_user_roles (tenant_user_id, role_id)
  WHERE revoked_at IS NULL;

-- Authority assignments
CREATE TABLE authority_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tenant_user_id UUID NOT NULL REFERENCES tenant_users(id) ON DELETE CASCADE,
  authority_type authority_type NOT NULL,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE,
  status authority_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Verifications
CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type entity_type NOT NULL,
  entity_id UUID NOT NULL,
  verified_by_authority_id UUID REFERENCES authority_assignments(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ NOT NULL,
  status verification_status NOT NULL DEFAULT 'VERIFIED'
);


-- =============================================================================
-- 4. AUTH TABLES
-- =============================================================================

-- OTP codes (for WhatsApp verification)
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_number_hash VARCHAR(64) NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  attempts INT DEFAULT 0,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sessions (custom auth)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- 5. MARKETPLACE TABLES
-- =============================================================================

CREATE TABLE marketplace_domains (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        marketplace_domain_code NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  icon        VARCHAR(10),
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE marketplace_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id   UUID NOT NULL REFERENCES marketplace_domains(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES marketplace_categories(id) ON DELETE SET NULL,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(120) NOT NULL,
  description VARCHAR(255),
  icon        VARCHAR(10),
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ,
  UNIQUE (domain_id, slug)
);

CREATE TABLE marketplace_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id       UUID NOT NULL REFERENCES marketplace_categories(id) ON DELETE RESTRICT,
  owner_user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_display_name VARCHAR(150) NOT NULL,
  name              VARCHAR(200) NOT NULL,
  slug              VARCHAR(220) NOT NULL,
  summary           VARCHAR(300),
  description       TEXT,
  base_price        NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_percent  SMALLINT NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  discount_amount   NUMERIC(12,2) GENERATED ALWAYS AS (base_price * discount_percent / 100) STORED,
  final_price       NUMERIC(12,2) GENERATED ALWAYS AS (base_price - (base_price * discount_percent / 100)) STORED,
  currency_code     VARCHAR(3) NOT NULL DEFAULT 'IDR',
  unit_label        VARCHAR(30) NOT NULL DEFAULT 'pcs',
  stock_qty         INT,
  is_service        BOOLEAN NOT NULL DEFAULT false,
  rating_avg        NUMERIC(2,1) NOT NULL DEFAULT 0 CHECK (rating_avg BETWEEN 0 AND 5),
  rating_count      INT NOT NULL DEFAULT 0,
  status            marketplace_item_status NOT NULL DEFAULT 'DRAFT',
  is_featured       BOOLEAN NOT NULL DEFAULT false,
  published_at      TIMESTAMPTZ,
  wa_number         TEXT,
  location_note     VARCHAR(200),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES users(id),
  updated_at        TIMESTAMPTZ,
  updated_by        UUID REFERENCES users(id),
  UNIQUE (tenant_id, slug)
);

CREATE TABLE marketplace_item_media (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  alt_text    VARCHAR(200),
  sort_order  SMALLINT NOT NULL DEFAULT 0,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX marketplace_item_media_one_primary
  ON marketplace_item_media (item_id) WHERE is_primary = true;

CREATE TABLE marketplace_item_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
  tag         VARCHAR(60) NOT NULL,
  UNIQUE (item_id, tag)
);

CREATE TABLE marketplace_transactions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id                  UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE RESTRICT,
  buyer_user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  qty                      INT NOT NULL DEFAULT 1 CHECK (qty > 0),
  item_price_snapshot      NUMERIC(12,2) NOT NULL,
  discount_snapshot_pct    SMALLINT NOT NULL DEFAULT 0,
  discount_snapshot_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal_amount          NUMERIC(12,2) NOT NULL,
  platform_fee_amount      NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount             NUMERIC(12,2) NOT NULL,
  status                   marketplace_tx_status NOT NULL DEFAULT 'PENDING',
  payment_status           marketplace_payment_status NOT NULL DEFAULT 'UNPAID',
  payment_method           VARCHAR(50),
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ,
  completed_at             TIMESTAMPTZ,
  cancelled_at             TIMESTAMPTZ
);

CREATE TABLE marketplace_transaction_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES marketplace_transactions(id) ON DELETE CASCADE,
  event_type     marketplace_tx_event_type NOT NULL,
  actor_user_id  UUID REFERENCES users(id),
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- 6. KAS RT TABLES
-- =============================================================================

CREATE TABLE kas_rt_transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE RESTRICT,
  title        VARCHAR(200) NOT NULL,
  amount       NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  type         kas_rt_tx_type NOT NULL,
  date         DATE NOT NULL,
  reference    VARCHAR(50),
  details      TEXT,
  category     VARCHAR(255),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES users(id),
  updated_at   TIMESTAMPTZ,
  deleted_at   TIMESTAMPTZ DEFAULT NULL
);

CREATE TABLE kas_rt_transaction_categories (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  community_id     UUID         NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  name             VARCHAR(100) NOT NULL,
  applies_to       VARCHAR(10)  NOT NULL DEFAULT 'both' CHECK (applies_to IN ('income', 'expense', 'both')),
  title_template   VARCHAR(255) NOT NULL DEFAULT '',
  desc_template    TEXT         NOT NULL DEFAULT '',
  sort_order       INT          NOT NULL DEFAULT 0,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, community_id, name)
);


-- =============================================================================
-- 7. NOTIFICATIONS & ANNOUNCEMENTS
-- =============================================================================

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

CREATE TABLE announcements (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  community_id     UUID        REFERENCES communities(id) ON DELETE SET NULL,
  title            VARCHAR(200) NOT NULL,
  excerpt          TEXT,
  body             TEXT,
  author_label     VARCHAR(150) NOT NULL DEFAULT 'Pengurus RT',
  author_user_id   UUID        REFERENCES users(id) ON DELETE SET NULL,
  is_pinned        BOOLEAN     NOT NULL DEFAULT false,
  published_at     TIMESTAMPTZ,
  expires_at       TIMESTAMPTZ,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID        REFERENCES users(id) ON DELETE SET NULL,
  updated_at       TIMESTAMPTZ,
  updated_by       UUID        REFERENCES users(id) ON DELETE SET NULL
);


-- =============================================================================
-- 8. ORGANISATION TABLES
-- =============================================================================

CREATE TABLE organisation_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organisation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_role_id UUID NOT NULL REFERENCES organisation_roles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  block_name TEXT NOT NULL DEFAULT '',
  whatsapp_number TEXT NOT NULL,
  profile_picture_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- 9. BADGES TABLES
-- =============================================================================

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


-- =============================================================================
-- 10. HOUSE JOIN REQUESTS
-- =============================================================================

CREATE TABLE house_join_requests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id            UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  requester_user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status              house_join_request_status NOT NULL DEFAULT 'PENDING',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at        TIMESTAMPTZ,
  responded_by        UUID REFERENCES users(id),
  UNIQUE (house_id, requester_user_id)
);


-- =============================================================================
-- 11. SYSTEM PREREGISTERED OWNERS
-- =============================================================================

CREATE TABLE system_preregistered_house_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  house_id UUID NOT NULL REFERENCES houses(id) ON DELETE CASCADE,
  pre_registered_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_row_no INT,
  source_full_name TEXT,
  source_status_rumah TEXT,
  source_keterangan TEXT,
  import_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PRE_REGISTERED'
    CHECK (status IN ('PRE_REGISTERED', 'CLAIMED', 'SKIPPED')),
  claimed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_system_prereg_owner_import_key
  ON system_preregistered_house_owners (import_key);

CREATE UNIQUE INDEX uq_system_prereg_owner_house_active
  ON system_preregistered_house_owners (tenant_id, house_id)
  WHERE status = 'PRE_REGISTERED';

COMMENT ON TABLE system_preregistered_house_owners IS
  'Tracks system-generated owner placeholders imported from legacy resident data.';


-- =============================================================================
-- 12. INDEXES
-- =============================================================================

-- Core table indexes
CREATE INDEX idx_tenants_created_by ON tenants(created_by);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_communities_tenant_id ON communities(tenant_id);
CREATE INDEX idx_communities_parent ON communities(parent_community_id);
CREATE INDEX idx_communities_created_by ON communities(created_by);
CREATE INDEX idx_houses_tenant_id ON houses(tenant_id);
CREATE INDEX idx_houses_community_id ON houses(community_id);
CREATE INDEX idx_houses_created_by ON houses(created_by);
CREATE INDEX idx_tenant_users_tenant_id ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_user_id ON tenant_users(user_id);
CREATE INDEX idx_tenant_users_status ON tenant_users(status);
CREATE INDEX idx_user_houses_tenant_id ON user_houses(tenant_id);
CREATE INDEX idx_user_houses_user_id ON user_houses(user_id);
CREATE INDEX idx_user_houses_house_id ON user_houses(house_id);
CREATE INDEX idx_user_houses_status ON user_houses(status);
CREATE INDEX idx_tenant_user_roles_tenant_user_id ON tenant_user_roles(tenant_user_id);
CREATE INDEX idx_tenant_user_roles_role_id ON tenant_user_roles(role_id);
CREATE INDEX idx_authority_assignments_tenant_id ON authority_assignments(tenant_id);
CREATE INDEX idx_authority_assignments_tenant_user_id ON authority_assignments(tenant_user_id);
CREATE INDEX idx_authority_assignments_community_id ON authority_assignments(community_id);
CREATE INDEX idx_authority_assignments_status ON authority_assignments(status);
CREATE INDEX idx_verifications_tenant_id ON verifications(tenant_id);
CREATE INDEX idx_verifications_entity ON verifications(entity_type, entity_id);

-- Auth table indexes
CREATE INDEX idx_otp_codes_wa_hash_expires ON otp_codes(wa_number_hash, expires_at);
CREATE INDEX idx_otp_codes_user_id ON otp_codes(user_id);
CREATE INDEX idx_otp_codes_created_at ON otp_codes(created_at);
CREATE UNIQUE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_sessions_last_active ON sessions(last_active_at);

-- User lookup indexes
CREATE UNIQUE INDEX idx_users_wa_number_unique ON users(wa_number) WHERE wa_number IS NOT NULL;
CREATE UNIQUE INDEX idx_users_username_lower ON users (LOWER(username)) WHERE username IS NOT NULL;

-- Marketplace indexes
CREATE INDEX idx_mkt_categories_domain ON marketplace_categories (domain_id, is_active, sort_order);
CREATE INDEX idx_mkt_items_category ON marketplace_items (category_id, status, published_at DESC);
CREATE INDEX idx_mkt_items_owner ON marketplace_items (owner_user_id, status);
CREATE INDEX idx_mkt_items_featured ON marketplace_items (status, is_featured) WHERE is_featured = true;
CREATE INDEX idx_mkt_items_tenant ON marketplace_items (tenant_id, status);
CREATE INDEX idx_mkt_item_media_item ON marketplace_item_media (item_id, sort_order);
CREATE INDEX idx_mkt_item_tags_item ON marketplace_item_tags (item_id);
CREATE INDEX idx_mkt_tx_buyer ON marketplace_transactions (buyer_user_id, status);
CREATE INDEX idx_mkt_tx_seller ON marketplace_transactions (seller_user_id, status);
CREATE INDEX idx_mkt_tx_item ON marketplace_transactions (item_id);
CREATE INDEX idx_mkt_tx_events_tx ON marketplace_transaction_events (transaction_id, created_at);

-- Kas RT indexes
CREATE INDEX idx_kas_rt_tx_category ON kas_rt_transactions (category);
CREATE INDEX idx_kas_rt_tx_categories_tenant_community ON kas_rt_transaction_categories (tenant_id, community_id, applies_to, sort_order);
CREATE INDEX idx_kas_rt_transactions_not_deleted ON kas_rt_transactions (tenant_id, community_id, date) WHERE deleted_at IS NULL;
CREATE INDEX idx_kas_rt_transactions_deleted ON kas_rt_transactions (deleted_at) WHERE deleted_at IS NOT NULL;

-- Notification indexes
CREATE INDEX idx_notifications_recipient_created ON notifications (recipient_user_id, created_at DESC);
CREATE INDEX idx_notifications_unread_recipient ON notifications (recipient_user_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_type_recipient_created ON notifications (type, recipient_user_id, created_at DESC);
CREATE INDEX idx_notifications_actor_created ON notifications (actor_user_id, created_at DESC);
CREATE INDEX idx_notifications_tenant_type_created ON notifications (tenant_id, type, created_at DESC);

-- Announcement indexes
CREATE INDEX idx_announcements_feed ON announcements (tenant_id, is_active, published_at DESC) WHERE is_active = true AND published_at IS NOT NULL;
CREATE INDEX idx_announcements_pinned ON announcements (tenant_id, is_pinned, published_at DESC) WHERE is_active = true;
CREATE INDEX idx_announcements_community ON announcements (community_id, published_at DESC) WHERE community_id IS NOT NULL AND is_active = true;
CREATE INDEX idx_announcements_author_user ON announcements (author_user_id) WHERE author_user_id IS NOT NULL;

-- Organisation indexes
CREATE INDEX idx_organisation_roles_tenant_id ON organisation_roles(tenant_id);
CREATE INDEX idx_organisation_roles_sort_order ON organisation_roles(tenant_id, sort_order);
CREATE INDEX idx_organisation_members_role_id ON organisation_members(organisation_role_id);
CREATE INDEX idx_organisation_members_sort_order ON organisation_members(organisation_role_id, sort_order);
CREATE INDEX idx_organisation_members_user_id ON organisation_members(user_id);

-- Badge indexes
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX idx_badges_sort_order ON badges(sort_order);

-- House join request indexes
CREATE INDEX idx_house_join_requests_house_id ON house_join_requests(house_id);
CREATE INDEX idx_house_join_requests_requester_user_id ON house_join_requests(requester_user_id);
CREATE INDEX idx_house_join_requests_status ON house_join_requests(status);


-- =============================================================================
-- 13. RLS POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE authority_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_item_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_transaction_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE kas_rt_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kas_rt_transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_preregistered_house_owners ENABLE ROW LEVEL SECURITY;

-- Default deny for anon (public access)
CREATE POLICY "Users: no anon access" ON users FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Tenants: no anon access" ON tenants FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Communities: no anon access" ON communities FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Houses: no anon access" ON houses FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Tenant users: no anon access" ON tenant_users FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "User houses: no anon access" ON user_houses FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Roles: no anon access" ON roles FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Tenant user roles: no anon access" ON tenant_user_roles FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Authority assignments: no anon access" ON authority_assignments FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Verifications: no anon access" ON verifications FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "OTP codes: no anon access" ON otp_codes FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Sessions: no anon access" ON sessions FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Kas RT transactions: no anon access" ON kas_rt_transactions FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Notifications: no anon access" ON notifications FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Announcements: no anon access" ON announcements FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Organisation roles: no anon access" ON organisation_roles FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Organisation members: no anon access" ON organisation_members FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Badges: no anon access" ON badges FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "User badges: no anon access" ON user_badges FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "House join requests: no anon access" ON house_join_requests FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "System prereg owners: no anon access" ON system_preregistered_house_owners FOR ALL TO anon USING (false) WITH CHECK (false);

-- Marketplace public read for active catalog
CREATE POLICY "Anyone can read active domains" ON marketplace_domains FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can read active categories" ON marketplace_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Anyone can read active items" ON marketplace_items FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "Anyone can read item media" ON marketplace_item_media FOR SELECT USING (true);
CREATE POLICY "Anyone can read item tags" ON marketplace_item_tags FOR SELECT USING (true);

-- Marketplace owner manages own items
CREATE POLICY "Owner can insert items" ON marketplace_items FOR INSERT WITH CHECK (owner_user_id = auth.uid());
CREATE POLICY "Owner can update own items" ON marketplace_items FOR UPDATE USING (owner_user_id = auth.uid());

-- Marketplace buyer/seller see own transactions
CREATE POLICY "Buyer can read own transactions" ON marketplace_transactions FOR SELECT USING (buyer_user_id = auth.uid() OR seller_user_id = auth.uid());
CREATE POLICY "Buyer can create transactions" ON marketplace_transactions FOR INSERT WITH CHECK (buyer_user_id = auth.uid());
CREATE POLICY "Participants can read transaction events" ON marketplace_transaction_events FOR SELECT USING (
  transaction_id IN (SELECT id FROM marketplace_transactions WHERE buyer_user_id = auth.uid() OR seller_user_id = auth.uid())
);

-- Kas RT categories: anyone can read
CREATE POLICY "Anyone can read kas RT categories" ON kas_rt_transaction_categories FOR SELECT USING (true);
CREATE POLICY "Anon cannot write kas RT categories" ON kas_rt_transaction_categories FOR ALL TO anon USING (false) WITH CHECK (false);


-- =============================================================================
-- 14. FUNCTIONS
-- =============================================================================

-- Helper: normalize WA number to +62XXXXXXXXXX format
CREATE OR REPLACE FUNCTION normalize_wa_number(v TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE STRICT AS $$
DECLARE
  digits TEXT;
BEGIN
  digits := regexp_replace(v, '[^0-9]', '', 'g');
  IF digits LIKE '62%' THEN
    RETURN '+' || digits;
  END IF;
  IF digits LIKE '0%' THEN
    RETURN '+62' || substring(digits FROM 2);
  END IF;
  RETURN '+62' || digits;
END;
$$;

-- RPC for case-insensitive username lookup at login
CREATE OR REPLACE FUNCTION get_user_by_username_lower(login_input TEXT)
RETURNS TABLE(id UUID, full_name VARCHAR(150), pin_hash TEXT, status user_status) AS $$
  SELECT u.id, u.full_name, u.pin_hash, u.status
  FROM users u
  WHERE u.username IS NOT NULL AND LOWER(TRIM(u.username)) = LOWER(TRIM(login_input));
$$ LANGUAGE sql STABLE;

-- Import legacy resident data as system pre-registered owners
CREATE OR REPLACE FUNCTION import_system_preregistered_residents(
  p_payload JSONB,
  p_tenant_id UUID,
  p_community_id UUID
)
RETURNS TABLE(processed_count INT, prereg_owner_count INT, skipped_count INT)
LANGUAGE plpgsql AS $$
DECLARE
  v_processed INT := 0;
  v_prereg INT := 0;
  v_skipped INT := 0;
BEGIN
  WITH src AS (
    SELECT
      (r->>'no')::INT AS row_no,
      NULLIF(TRIM(COALESCE(r->>'full_name', '')), '') AS full_name,
      UPPER(regexp_replace(COALESCE(r->>'blok_no_rumah', ''), '[^A-Za-z0-9]', '', 'g')) AS blok_key,
      NULLIF(TRIM(COALESCE(r->>'status_rumah', '')), '') AS status_rumah,
      NULLIF(TRIM(COALESCE(r->>'keterangan', '')), '') AS keterangan
    FROM jsonb_array_elements(COALESCE(p_payload->'residents', '[]'::jsonb)) AS r
  ),
  cleaned AS (
    SELECT row_no, full_name, blok_key, status_rumah, keterangan,
      (full_name IS NULL OR blok_key = '' OR LOWER(COALESCE(keterangan, '')) LIKE '%kosong%' OR LOWER(COALESCE(status_rumah, '')) LIKE '%kosong%') AS is_vacant
    FROM src WHERE blok_key <> ''
  ),
  upsert_houses AS (
    INSERT INTO houses (id, tenant_id, community_id, name, blok_rumah, status, is_active, total_residents, created_by)
    SELECT gen_random_uuid(), p_tenant_id, p_community_id, blok_key, blok_key,
      CASE WHEN LOWER(COALESCE(status_rumah, '')) LIKE '%sewa%' THEN 'KONTRAKAN'::house_status ELSE 'PRIBADI'::house_status END,
      true, 0, '00000000-0000-0000-0000-000000000000'::uuid
    FROM cleaned
    ON CONFLICT (tenant_id, community_id, blok_rumah) WHERE blok_rumah IS NOT NULL
    DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, is_active = true
    RETURNING id, blok_rumah
  ),
  houses_map AS (
    SELECT h.id AS house_id, h.blok_rumah FROM houses h
    WHERE h.tenant_id = p_tenant_id AND h.community_id = p_community_id
      AND h.blok_rumah IN (SELECT blok_key FROM cleaned)
  ),
  prereg_candidates AS (
    SELECT c.row_no, c.full_name, c.blok_key, c.status_rumah, c.keterangan, hm.house_id
    FROM cleaned c JOIN houses_map hm ON hm.blok_rumah = c.blok_key WHERE c.is_vacant = false
  ),
  upsert_users AS (
    INSERT INTO users (id, full_name, username, status, created_by)
    SELECT gen_random_uuid(), pc.full_name, 'sys_prereg_' || LOWER(pc.blok_key), 'INACTIVE'::user_status, '00000000-0000-0000-0000-000000000000'::uuid
    FROM prereg_candidates pc
    ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name
    RETURNING id, username
  ),
  users_map AS (
    SELECT u.id AS user_id, u.username FROM users u
    WHERE u.username LIKE 'sys_prereg_%' AND u.username IN (SELECT 'sys_prereg_' || LOWER(blok_key) FROM prereg_candidates)
  ),
  upsert_tenant_users AS (
    INSERT INTO tenant_users (id, tenant_id, user_id, status)
    SELECT gen_random_uuid(), p_tenant_id, um.user_id, 'ACTIVE'::tenant_user_status FROM users_map um
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET status = 'ACTIVE'::tenant_user_status RETURNING id
  ),
  upsert_owner_links AS (
    INSERT INTO user_houses (id, tenant_id, user_id, house_id, relationship, is_primary, status, created_by)
    SELECT gen_random_uuid(), p_tenant_id, um.user_id, pc.house_id, 'OWNER'::relationship_type, true, 'ACTIVE'::user_house_status, '00000000-0000-0000-0000-000000000000'::uuid
    FROM prereg_candidates pc JOIN users_map um ON um.username = ('sys_prereg_' || LOWER(pc.blok_key))
    ON CONFLICT DO NOTHING RETURNING id
  ),
  upsert_registry AS (
    INSERT INTO system_preregistered_house_owners (tenant_id, community_id, house_id, pre_registered_user_id, source_row_no, source_full_name, source_status_rumah, source_keterangan, import_key, status)
    SELECT p_tenant_id, p_community_id, pc.house_id, um.user_id, pc.row_no, pc.full_name, pc.status_rumah, pc.keterangan,
      p_tenant_id::text || ':' || p_community_id::text || ':' || pc.blok_key, 'PRE_REGISTERED'
    FROM prereg_candidates pc JOIN users_map um ON um.username = ('sys_prereg_' || LOWER(pc.blok_key))
    ON CONFLICT (import_key) DO UPDATE SET source_row_no = EXCLUDED.source_row_no, source_full_name = EXCLUDED.source_full_name,
      source_status_rumah = EXCLUDED.source_status_rumah, source_keterangan = EXCLUDED.source_keterangan, updated_at = NOW(),
      status = CASE WHEN system_preregistered_house_owners.status = 'CLAIMED' THEN 'CLAIMED' ELSE 'PRE_REGISTERED' END
    RETURNING id
  )
  SELECT (SELECT COUNT(*) FROM cleaned), (SELECT COUNT(*) FROM prereg_candidates), (SELECT COUNT(*) FROM cleaned WHERE is_vacant = true)
  INTO v_processed, v_prereg, v_skipped;
  RETURN QUERY SELECT v_processed, v_prereg, v_skipped;
END;
$$;

-- Claim system pre-registered owner with real user
CREATE OR REPLACE FUNCTION claim_system_preregistered_owner(
  p_tenant_id UUID,
  p_house_id UUID,
  p_real_user_id UUID
)
RETURNS TABLE(claimed BOOLEAN, pre_registered_user_id UUID, message TEXT)
LANGUAGE plpgsql AS $$
DECLARE
  v_prereg RECORD;
BEGIN
  SELECT * INTO v_prereg FROM system_preregistered_house_owners sp
  WHERE sp.tenant_id = p_tenant_id AND sp.house_id = p_house_id AND sp.status = 'PRE_REGISTERED' FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::uuid, 'no_pre_registered_owner';
    RETURN;
  END IF;

  UPDATE user_houses SET status = 'INACTIVE', is_primary = false, move_out_date = CURRENT_DATE
  WHERE tenant_id = p_tenant_id AND house_id = p_house_id AND user_id = v_prereg.pre_registered_user_id
    AND relationship = 'OWNER' AND status = 'ACTIVE';

  INSERT INTO tenant_users (id, tenant_id, user_id, status)
  VALUES (gen_random_uuid(), p_tenant_id, p_real_user_id, 'ACTIVE')
  ON CONFLICT (tenant_id, user_id) DO UPDATE SET status = 'ACTIVE';

  UPDATE user_houses SET is_primary = false, status = 'INACTIVE', move_out_date = CURRENT_DATE
  WHERE tenant_id = p_tenant_id AND user_id = p_real_user_id AND is_primary = true AND status = 'ACTIVE' AND house_id <> p_house_id;

  UPDATE user_houses SET relationship = 'OWNER', is_primary = true, status = 'ACTIVE'
  WHERE tenant_id = p_tenant_id AND user_id = p_real_user_id AND house_id = p_house_id;

  IF NOT FOUND THEN
    INSERT INTO user_houses (id, tenant_id, user_id, house_id, relationship, is_primary, status, created_by)
    VALUES (gen_random_uuid(), p_tenant_id, p_real_user_id, p_house_id, 'OWNER', true, 'ACTIVE', p_real_user_id);
  END IF;

  UPDATE system_preregistered_house_owners SET status = 'CLAIMED', claimed_by_user_id = p_real_user_id, claimed_at = NOW(), updated_at = NOW()
  WHERE id = v_prereg.id;

  RETURN QUERY SELECT true, v_prereg.pre_registered_user_id, 'claimed';
END;
$$;


-- =============================================================================
-- 15. SEED DATA
-- =============================================================================

-- Default tenant
INSERT INTO tenants (id, name, description, type, status) VALUES
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'Sawangan Regensi', 'Ekosistem digital Sawangan Regensi RT 03', 'PERUMAHAN', 'ACTIVE');

-- Default communities
INSERT INTO communities (id, tenant_id, code, name, level, parent_community_id) VALUES
  ('b0000000-0000-7000-8000-000000000001'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'RW14', 'RW 14', 'RW', NULL),
  ('b0000000-0000-7000-8000-000000000002'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'RT03', 'RT 03 Sawangan Regensi', 'RT', 'b0000000-0000-7000-8000-000000000001'::uuid);

-- Default roles
INSERT INTO roles (id, name, description, scope) VALUES
  (1, 'WARGA', 'Warga biasa', 'TENANT'),
  (2, 'SELLER', 'Penjual', 'TENANT'),
  (3, 'BUYER', 'Pembeli', 'TENANT'),
  (4, 'RT_ADMIN', 'Admin RT', 'TENANT'),
  (5, 'RW_ADMIN', 'Admin RW', 'TENANT'),
  (6, 'KOPERASI_ADMIN', 'Admin Koperasi', 'TENANT'),
  (7, 'PLATFORM_ARBITER', 'Arbiter platform', 'SYSTEM'),
  (8, 'RT_BENDAHARA', 'Bendahara RT (bisa mencatat transaksi kas RT)', 'TENANT');

-- Marketplace domains
INSERT INTO marketplace_domains (id, code, name, description, icon, sort_order) VALUES
  ('d0000000-0000-7000-8000-000000000001'::uuid, 'UMKM', 'UMKM', 'Produk UMKM warga — sembako, makanan, kerajinan', '🛒', 1),
  ('d0000000-0000-7000-8000-000000000002'::uuid, 'JASA', 'Jasa Warga', 'Layanan jasa antar-warga', '🔧', 2);

-- Marketplace categories
INSERT INTO marketplace_categories (id, domain_id, name, slug, description, icon, sort_order) VALUES
  ('c1000000-0000-7000-8000-000000000001'::uuid, 'd0000000-0000-7000-8000-000000000001'::uuid, 'Sembako', 'sembako', 'Sembako & kebutuhan sehari-hari', '🛍️', 1),
  ('c1000000-0000-7000-8000-000000000002'::uuid, 'd0000000-0000-7000-8000-000000000001'::uuid, 'Makanan & Minuman', 'makanan-minuman', 'Makanan, cemilan, minuman', '🍱', 2),
  ('c1000000-0000-7000-8000-000000000003'::uuid, 'd0000000-0000-7000-8000-000000000001'::uuid, 'Kerajinan Tangan', 'kerajinan-tangan', 'Hasil kerajinan warga', '🎨', 3),
  ('c1000000-0000-7000-8000-000000000004'::uuid, 'd0000000-0000-7000-8000-000000000001'::uuid, 'Sayur & Buah', 'sayur-buah', 'Sayur & buah dari kebun warga', '🥬', 4),
  ('c2000000-0000-7000-8000-000000000001'::uuid, 'd0000000-0000-7000-8000-000000000002'::uuid, 'Kelistrikan', 'kelistrikan', 'Perbaikan & instalasi listrik', '⚡', 1),
  ('c2000000-0000-7000-8000-000000000002'::uuid, 'd0000000-0000-7000-8000-000000000002'::uuid, 'Jahit', 'jahit', 'Jahit baju, kaos, dll', '🧵', 2),
  ('c2000000-0000-7000-8000-000000000003'::uuid, 'd0000000-0000-7000-8000-000000000002'::uuid, 'Antar-Jemput', 'antar-jemput', 'Antar jemput dalam kompleks', '🚗', 3),
  ('c2000000-0000-7000-8000-000000000004'::uuid, 'd0000000-0000-7000-8000-000000000002'::uuid, 'Bersih-bersih', 'bersih-bersih', 'Kebersihan rumah & kantor', '🧹', 4);

-- Marketplace sample items
INSERT INTO marketplace_items (id, tenant_id, category_id, owner_user_id, owner_display_name, name, slug, summary, base_price, discount_percent, currency_code, unit_label, stock_qty, is_service, status, published_at) VALUES
  ('e1000000-0000-7000-8000-000000000001'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'c1000000-0000-7000-8000-000000000001'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'Toko Pak Edi', 'Beras Premium 5kg', 'beras-premium-5kg', 'Beras kualitas premium dari Cianjur', 75000, 0, 'IDR', 'karung', 50, false, 'ACTIVE', NOW()),
  ('e1000000-0000-7000-8000-000000000002'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'c1000000-0000-7000-8000-000000000001'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'Warung Bu Siti', 'Minyak Goreng 2L', 'minyak-goreng-2l', 'Minyak goreng kemasan 2 liter', 36000, 5, 'IDR', 'botol', 30, false, 'ACTIVE', NOW()),
  ('e1000000-0000-7000-8000-000000000003'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'c1000000-0000-7000-8000-000000000002'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'Dapur Bu Ani', 'Nasi Uduk Komplit', 'nasi-uduk-komplit', 'Nasi uduk + lauk lengkap, pagi hari', 15000, 0, 'IDR', 'porsi', NULL, false, 'ACTIVE', NOW()),
  ('e1000000-0000-7000-8000-000000000004'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'c1000000-0000-7000-8000-000000000002'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'Kue Mba Rina', 'Kue Lapis Legit', 'kue-lapis-legit', 'Kue lapis legit homemade, loyang kecil', 85000, 10, 'IDR', 'loyang', 10, false, 'ACTIVE', NOW()),
  ('e1000000-0000-7000-8000-000000000005'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'c1000000-0000-7000-8000-000000000003'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'Craft by Dewi', 'Tas Rajut Handmade', 'tas-rajut-handmade', 'Tas rajut katun warna-warni', 120000, 15, 'IDR', 'pcs', 5, false, 'ACTIVE', NOW()),
  ('e1000000-0000-7000-8000-000000000006'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'c1000000-0000-7000-8000-000000000004'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'Kebun Pak Agus', 'Paket Sayur Segar', 'paket-sayur-segar', 'Bayam, kangkung, tomat, cabai — segar dari kebun', 25000, 0, 'IDR', 'paket', 20, false, 'ACTIVE', NOW()),
  ('e2000000-0000-7000-8000-000000000001'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'c2000000-0000-7000-8000-000000000001'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'Pak Joko Listrik', 'Perbaikan Instalasi Listrik', 'perbaikan-instalasi-listrik', 'Pasang baru, tambah daya, perbaikan arus pendek', 150000, 0, 'IDR', 'kunjungan', NULL, true, 'ACTIVE', NOW()),
  ('e2000000-0000-7000-8000-000000000002'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'c2000000-0000-7000-8000-000000000002'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'Bu Ratna Taylor', 'Jahit & Permak Pakaian', 'jahit-permak-pakaian', 'Potong, jahit baru, permak celana/baju', 50000, 0, 'IDR', 'item', NULL, true, 'ACTIVE', NOW()),
  ('e2000000-0000-7000-8000-000000000003'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'c2000000-0000-7000-8000-000000000003'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'Bang Dedi Ojek', 'Ojek Dalam Kompleks', 'ojek-dalam-kompleks', 'Antar jemput dalam area Sawangan Regensi', 10000, 0, 'IDR', 'trip', NULL, true, 'ACTIVE', NOW()),
  ('e2000000-0000-7000-8000-000000000004'::uuid, 'a0000000-0000-7000-8000-000000000001'::uuid, 'c2000000-0000-7000-8000-000000000004'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'Tim Bersih Blok A', 'Bersih Rumah & Kantor', 'bersih-rumah-kantor', 'Deep clean rumah, pembersihan taman, garasi', 200000, 10, 'IDR', 'sesi', NULL, true, 'ACTIVE', NOW());

-- Kas RT transaction categories
INSERT INTO kas_rt_transaction_categories (tenant_id, community_id, name, applies_to, title_template, desc_template, sort_order) VALUES
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'IPL', 'income', 'IPL Bulan {bulan}', 'Pembayaran IPL untuk blok {blok} periode {bulan}', 10),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Sumbangan', 'income', 'Sumbangan Bulan {bulan}', 'Sumbangan sukarela dari blok {blok} periode {bulan}', 20),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Denda', 'income', 'Denda dari Blok {blok}', 'Pembayaran denda dari blok {blok}', 30),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Pendapatan Lain', 'income', 'Pendapatan Lain-lain Bulan {bulan}', 'Pendapatan lain-lain periode {bulan}', 40),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Kebersihan', 'expense', 'Biaya Kebersihan {bulan}', 'Pembayaran petugas kebersihan periode {bulan}', 10),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Keamanan', 'expense', 'Biaya Keamanan/Satpam {bulan}', 'Honorarium satpam/keamanan periode {bulan}', 20),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Operasional', 'expense', 'Biaya Operasional {bulan}', 'Pengeluaran operasional RT periode {bulan}', 30),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Perbaikan & Pemeliharaan', 'expense', 'Biaya Perbaikan {bulan}', 'Biaya perbaikan/pemeliharaan lingkungan RT periode {bulan}', 40),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Pengeluaran Lain', 'expense', 'Pengeluaran Lain-lain {bulan}', 'Pengeluaran lain-lain periode {bulan}', 50)
ON CONFLICT (tenant_id, community_id, name) DO UPDATE SET applies_to = EXCLUDED.applies_to, title_template = EXCLUDED.title_template, desc_template = EXCLUDED.desc_template, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- Organisation roles
INSERT INTO organisation_roles (tenant_id, title, sort_order) VALUES
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'Ketua RT 03', 1),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'Wakil Ketua RT 03', 2),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'Bendahara', 3),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'Sekretaris', 4),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'Security', 5),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'Sesi Lingkungan', 6),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'Sesi Remaja', 7),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'Sesi Ibu-ibu', 8);

-- Organisation members
INSERT INTO organisation_members (organisation_role_id, full_name, block_name, whatsapp_number, sort_order)
SELECT r.id, 'Bapak Ketua RT', 'Blok A', '6281234567890', 0 FROM organisation_roles r WHERE r.tenant_id = 'a0000000-0000-7000-8000-000000000001'::uuid AND r.title = 'Ketua RT 03' LIMIT 1;
INSERT INTO organisation_members (organisation_role_id, full_name, block_name, whatsapp_number, sort_order)
SELECT r.id, 'Bapak Wakil Ketua', 'Blok B', '6281234567891', 0 FROM organisation_roles r WHERE r.tenant_id = 'a0000000-0000-7000-8000-000000000001'::uuid AND r.title = 'Wakil Ketua RT 03' LIMIT 1;
INSERT INTO organisation_members (organisation_role_id, full_name, block_name, whatsapp_number, sort_order)
SELECT r.id, 'Ibu Bendahara Satu', 'Blok C', '6281234567892', 0 FROM organisation_roles r WHERE r.tenant_id = 'a0000000-0000-7000-8000-000000000001'::uuid AND r.title = 'Bendahara' LIMIT 1;
INSERT INTO organisation_members (organisation_role_id, full_name, block_name, whatsapp_number, sort_order)
SELECT r.id, 'Ibu Bendahara Dua', 'Blok D', '6281234567893', 1 FROM organisation_roles r WHERE r.tenant_id = 'a0000000-0000-7000-8000-000000000001'::uuid AND r.title = 'Bendahara' LIMIT 1;
INSERT INTO organisation_members (organisation_role_id, full_name, block_name, whatsapp_number, sort_order)
SELECT r.id, 'Bapak/Ibu Sekretaris', 'Blok E', '6281234567894', 0 FROM organisation_roles r WHERE r.tenant_id = 'a0000000-0000-7000-8000-000000000001'::uuid AND r.title = 'Sekretaris' LIMIT 1;
INSERT INTO organisation_members (organisation_role_id, full_name, block_name, whatsapp_number, sort_order)
SELECT r.id, 'Petugas Security 1', 'Blok F', '6281234567895', 0 FROM organisation_roles r WHERE r.tenant_id = 'a0000000-0000-7000-8000-000000000001'::uuid AND r.title = 'Security' LIMIT 1;
INSERT INTO organisation_members (organisation_role_id, full_name, block_name, whatsapp_number, sort_order)
SELECT r.id, 'Petugas Security 2', 'Blok G', '6281234567896', 1 FROM organisation_roles r WHERE r.tenant_id = 'a0000000-0000-7000-8000-000000000001'::uuid AND r.title = 'Security' LIMIT 1;
INSERT INTO organisation_members (organisation_role_id, full_name, block_name, whatsapp_number, sort_order)
SELECT r.id, 'Petugas Security 3', 'Blok H', '6281234567897', 2 FROM organisation_roles r WHERE r.tenant_id = 'a0000000-0000-7000-8000-000000000001'::uuid AND r.title = 'Security' LIMIT 1;
INSERT INTO organisation_members (organisation_role_id, full_name, block_name, whatsapp_number, sort_order)
SELECT r.id, 'Koordinator Lingkungan', 'Blok I', '6281234567898', 0 FROM organisation_roles r WHERE r.tenant_id = 'a0000000-0000-7000-8000-000000000001'::uuid AND r.title = 'Sesi Lingkungan' LIMIT 1;
INSERT INTO organisation_members (organisation_role_id, full_name, block_name, whatsapp_number, sort_order)
SELECT r.id, 'Koordinator Remaja', 'Blok J', '6281234567899', 0 FROM organisation_roles r WHERE r.tenant_id = 'a0000000-0000-7000-8000-000000000001'::uuid AND r.title = 'Sesi Remaja' LIMIT 1;
INSERT INTO organisation_members (organisation_role_id, full_name, block_name, whatsapp_number, sort_order)
SELECT r.id, 'Koordinator Ibu-ibu', 'Blok K', '6281234567800', 0 FROM organisation_roles r WHERE r.tenant_id = 'a0000000-0000-7000-8000-000000000001'::uuid AND r.title = 'Sesi Ibu-ibu' LIMIT 1;

-- Badges
INSERT INTO badges (id, code, name, description, icon, sort_order) VALUES
  (1, 'warga_baru', 'Warga Baru', 'Baru bergabung di lingkungan', '🌱', 1),
  (2, 'kepala_keluarga', 'Kepala Keluarga', 'Menjadi kepala rumah tangga', '👑', 2),
  (3, 'kontributor_kas', 'Kontributor Kas', 'Berkontribusi mencatat kas RT', '📒', 3),
  (4, 'peduli_lingkungan', 'Peduli Lingkungan', 'Aktif dalam kegiatan lingkungan', '🌿', 4),
  (5, 'warga_aktif', 'Warga Aktif', 'Sudah 30 hari aktif di aplikasi', '⭐', 5),
  (6, 'pembayar_tepat', 'Pembayar Tepat', 'Selalu bayar iuran tepat waktu', '✅', 6),
  (7, 'penggerak_rt', 'Penggerak RT', 'Membantu menggerakkan warga', '🤝', 7);

-- Announcements (seed)
INSERT INTO announcements (tenant_id, community_id, title, excerpt, author_label, is_pinned, published_at, is_active) VALUES
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Bazar RT 03 - Akhir Pekan Ini', 'Lokasi lapangan RT. Bawa keluarga, banyak stand makanan dan kerajinan warga.', 'Pengurus RT 03', true, NOW() - INTERVAL '1 hour', true),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Jasa Service AC Blok N', 'Bersih & isi freon. Hubungi Pak Budi untuk info lebih lanjut.', 'Blok N', false, NOW() - INTERVAL '2 hours', true),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Kumpul Kebersihan Minggu Pagi', 'Kerja bakti lingkungan. Meet di poskamling pukul 06.00.', 'Ketua RT', false, NOW() - INTERVAL '3 hours', true),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'b0000000-0000-7000-8000-000000000002'::uuid, 'Lelang Barang Bekas Layak Pakai', 'Meja, kursi, lemari tersedia. Lihat katalog di grup WhatsApp RT.', 'Warga Blok A', false, NOW() - INTERVAL '5 hours', true);


-- =============================================================================
-- WA NUMBER CONSTRAINT (applied after seeds to allow legacy data import)
-- =============================================================================

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_wa_number_canonical,
  ADD CONSTRAINT users_wa_number_canonical
  CHECK (wa_number IS NULL OR wa_number ~ '^\+62[0-9]{8,13}$');


-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
