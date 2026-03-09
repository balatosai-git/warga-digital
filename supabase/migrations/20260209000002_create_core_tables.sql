-- Users (global human identity) - must exist first for FKs
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(150) NOT NULL,
  wa_number TEXT,
  wa_verified_at TIMESTAMPTZ,
  email VARCHAR(150) UNIQUE,
  date_of_birth DATE,
  status user_status NOT NULL DEFAULT 'INACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id)
);

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
  address VARCHAR(255),
  total_residents INT DEFAULT 0,
  status house_status NOT NULL DEFAULT 'PRIBADI',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ,
  updated_by UUID REFERENCES users(id)
);

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

-- One ACTIVE primary residence per tenant per user (partial unique index)
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

-- Partial unique: one active assignment per tenant_user + role
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
