-- Core table indexes (FKs and lookup columns)
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
