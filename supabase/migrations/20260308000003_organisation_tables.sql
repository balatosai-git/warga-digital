-- Organisation structure per tenant (roles + members for "Struktur Organisasi" / Kelola Organisasi)
-- Scoped by tenant_id. Managed via API with canManageOrganisation permission.

CREATE TABLE organisation_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organisation_roles_tenant_id ON organisation_roles(tenant_id);
CREATE INDEX idx_organisation_roles_sort_order ON organisation_roles(tenant_id, sort_order);

CREATE TABLE organisation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_role_id UUID NOT NULL REFERENCES organisation_roles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  block_name TEXT NOT NULL DEFAULT '',
  whatsapp_number TEXT NOT NULL,
  profile_picture_url TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organisation_members_role_id ON organisation_members(organisation_role_id);
CREATE INDEX idx_organisation_members_sort_order ON organisation_members(organisation_role_id, sort_order);

ALTER TABLE organisation_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organisation roles: no anon access"
  ON organisation_roles FOR ALL TO anon USING (false) WITH CHECK (false);

CREATE POLICY "Organisation members: no anon access"
  ON organisation_members FOR ALL TO anon USING (false) WITH CHECK (false);
