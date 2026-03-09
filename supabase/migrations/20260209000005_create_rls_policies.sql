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

-- Service role bypasses RLS (used by API routes with service_role key)
-- Supabase service_role key automatically bypasses RLS

-- Default deny for anon (public access)
-- These policies ensure anon users cannot read/write
-- Authenticated access will use service_role from API routes
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
