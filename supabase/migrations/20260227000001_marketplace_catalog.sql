-- ─── Marketplace Enums ──────────────────────────────────────────────────────

CREATE TYPE marketplace_domain_code AS ENUM ('UMKM', 'JASA');

CREATE TYPE marketplace_item_status AS ENUM ('DRAFT', 'ACTIVE', 'SOLD_OUT', 'ARCHIVED');

CREATE TYPE marketplace_tx_status AS ENUM (
  'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REFUNDED'
);

CREATE TYPE marketplace_payment_status AS ENUM (
  'UNPAID', 'PAID', 'FAILED', 'REFUNDED'
);

CREATE TYPE marketplace_tx_event_type AS ENUM (
  'CREATED', 'CONFIRMED', 'PAID', 'IN_PROGRESS', 'COMPLETED',
  'CANCELLED', 'REFUND_REQUESTED', 'REFUNDED'
);

-- ─── Domains ────────────────────────────────────────────────────────────────

CREATE TABLE marketplace_domains (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code marketplace_domain_code NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  icon VARCHAR(10),
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Categories ─────────────────────────────────────────────────────────────

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

-- ─── Items ──────────────────────────────────────────────────────────────────

CREATE TABLE marketplace_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id       UUID NOT NULL REFERENCES marketplace_categories(id) ON DELETE RESTRICT,
  owner_user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Snapshot so card never needs a join to users for display
  owner_display_name VARCHAR(150) NOT NULL,

  name              VARCHAR(200) NOT NULL,
  slug              VARCHAR(220) NOT NULL,
  summary           VARCHAR(300),
  description       TEXT,

  -- Pricing
  base_price        NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_percent  SMALLINT NOT NULL DEFAULT 0
    CHECK (discount_percent BETWEEN 0 AND 100),
  discount_amount   NUMERIC(12,2) GENERATED ALWAYS AS (
    base_price * discount_percent / 100
  ) STORED,
  final_price       NUMERIC(12,2) GENERATED ALWAYS AS (
    base_price - (base_price * discount_percent / 100)
  ) STORED,
  currency_code     VARCHAR(3) NOT NULL DEFAULT 'IDR',
  unit_label        VARCHAR(30) NOT NULL DEFAULT 'pcs',

  -- Inventory / service flag
  stock_qty         INT,
  is_service        BOOLEAN NOT NULL DEFAULT false,

  -- Social proof
  rating_avg        NUMERIC(2,1) NOT NULL DEFAULT 0
    CHECK (rating_avg BETWEEN 0 AND 5),
  rating_count      INT NOT NULL DEFAULT 0,

  -- Visibility
  status            marketplace_item_status NOT NULL DEFAULT 'DRAFT',
  is_featured       BOOLEAN NOT NULL DEFAULT false,
  published_at      TIMESTAMPTZ,

  -- Contact / location hints
  wa_number         TEXT,
  location_note     VARCHAR(200),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES users(id),
  updated_at        TIMESTAMPTZ,
  updated_by        UUID REFERENCES users(id),

  UNIQUE (tenant_id, slug)
);

-- ─── Item Media ─────────────────────────────────────────────────────────────

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

-- ─── Item Tags ──────────────────────────────────────────────────────────────

CREATE TABLE marketplace_item_tags (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id     UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
  tag         VARCHAR(60) NOT NULL,
  UNIQUE (item_id, tag)
);

-- ─── Transactions ───────────────────────────────────────────────────────────

CREATE TABLE marketplace_transactions (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id                  UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE RESTRICT,
  buyer_user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  qty                      INT NOT NULL DEFAULT 1 CHECK (qty > 0),

  -- Price snapshot at time of transaction
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

-- ─── Transaction Events (audit / timeline) ──────────────────────────────────

CREATE TABLE marketplace_transaction_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES marketplace_transactions(id) ON DELETE CASCADE,
  event_type     marketplace_tx_event_type NOT NULL,
  actor_user_id  UUID REFERENCES users(id),
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX idx_mkt_categories_domain   ON marketplace_categories (domain_id, is_active, sort_order);
CREATE INDEX idx_mkt_items_category      ON marketplace_items (category_id, status, published_at DESC);
CREATE INDEX idx_mkt_items_owner         ON marketplace_items (owner_user_id, status);
CREATE INDEX idx_mkt_items_featured      ON marketplace_items (status, is_featured) WHERE is_featured = true;
CREATE INDEX idx_mkt_items_tenant        ON marketplace_items (tenant_id, status);
CREATE INDEX idx_mkt_item_media_item     ON marketplace_item_media (item_id, sort_order);
CREATE INDEX idx_mkt_item_tags_item      ON marketplace_item_tags (item_id);
CREATE INDEX idx_mkt_tx_buyer            ON marketplace_transactions (buyer_user_id, status);
CREATE INDEX idx_mkt_tx_seller           ON marketplace_transactions (seller_user_id, status);
CREATE INDEX idx_mkt_tx_item             ON marketplace_transactions (item_id);
CREATE INDEX idx_mkt_tx_events_tx        ON marketplace_transaction_events (transaction_id, created_at);

-- ─── RLS Policies (placeholders – enable per table when needed) ─────────────

ALTER TABLE marketplace_domains             ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_items               ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_item_media          ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_item_tags           ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_transaction_events  ENABLE ROW LEVEL SECURITY;

-- Public read for active catalog
CREATE POLICY "Anyone can read active domains"
  ON marketplace_domains FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can read active categories"
  ON marketplace_categories FOR SELECT USING (is_active = true);

CREATE POLICY "Anyone can read active items"
  ON marketplace_items FOR SELECT USING (status = 'ACTIVE');

CREATE POLICY "Anyone can read item media"
  ON marketplace_item_media FOR SELECT USING (true);

CREATE POLICY "Anyone can read item tags"
  ON marketplace_item_tags FOR SELECT USING (true);

-- Owner manages own items
CREATE POLICY "Owner can insert items"
  ON marketplace_items FOR INSERT WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "Owner can update own items"
  ON marketplace_items FOR UPDATE USING (owner_user_id = auth.uid());

-- Buyer/seller see own transactions
CREATE POLICY "Buyer can read own transactions"
  ON marketplace_transactions FOR SELECT
  USING (buyer_user_id = auth.uid() OR seller_user_id = auth.uid());

CREATE POLICY "Buyer can create transactions"
  ON marketplace_transactions FOR INSERT WITH CHECK (buyer_user_id = auth.uid());

CREATE POLICY "Participants can read transaction events"
  ON marketplace_transaction_events FOR SELECT
  USING (
    transaction_id IN (
      SELECT id FROM marketplace_transactions
      WHERE buyer_user_id = auth.uid() OR seller_user_id = auth.uid()
    )
  );
