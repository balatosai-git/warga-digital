-- Seed default organisation structure for RT 03 (default tenant)
-- Matches the previous static ORGANISATION_ROLES structure.

INSERT INTO organisation_roles (tenant_id, title, sort_order) VALUES
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'Ketua RT 03', 1),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'Wakil Ketua RT 03', 2),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'Bendahara', 3),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'Sekretaris', 4),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'Security', 5),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'Sesi Lingkungan', 6),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'Sesi Remaja', 7),
  ('a0000000-0000-7000-8000-000000000001'::uuid, 'Sesi Ibu-ibu', 8);

-- Members for each role (select role by title + tenant)
INSERT INTO organisation_members (organisation_role_id, full_name, block_name, whatsapp_number, sort_order)
SELECT r.id, 'Bapak Ketua RT', 'Blok A', '6281234567890', 0
FROM organisation_roles r WHERE r.tenant_id = 'a0000000-0000-7000-8000-000000000001'::uuid AND r.title = 'Ketua RT 03' LIMIT 1;

INSERT INTO organisation_members (organisation_role_id, full_name, block_name, whatsapp_number, sort_order)
SELECT r.id, 'Bapak Wakil Ketua', 'Blok B', '6281234567891', 0
FROM organisation_roles r WHERE r.tenant_id = 'a0000000-0000-7000-8000-000000000001'::uuid AND r.title = 'Wakil Ketua RT 03' LIMIT 1;

INSERT INTO organisation_members (organisation_role_id, full_name, block_name, whatsapp_number, sort_order)
SELECT r.id, 'Ibu Bendahara Satu', 'Blok C', '6281234567892', 0
FROM organisation_roles r WHERE r.tenant_id = 'a0000000-0000-7000-8000-000000000001'::uuid AND r.title = 'Bendahara' LIMIT 1;
INSERT INTO organisation_members (organisation_role_id, full_name, block_name, whatsapp_number, sort_order)
SELECT r.id, 'Ibu Bendahara Dua', 'Blok D', '6281234567893', 1
FROM organisation_roles r WHERE r.tenant_id = 'a0000000-0000-7000-8000-000000000001'::uuid AND r.title = 'Bendahara' LIMIT 1;

INSERT INTO organisation_members (organisation_role_id, full_name, block_name, whatsapp_number, sort_order)
SELECT r.id, 'Bapak/Ibu Sekretaris', 'Blok E', '6281234567894', 0
FROM organisation_roles r WHERE r.tenant_id = 'a0000000-0000-7000-8000-000000000001'::uuid AND r.title = 'Sekretaris' LIMIT 1;

INSERT INTO organisation_members (organisation_role_id, full_name, block_name, whatsapp_number, sort_order)
SELECT r.id, 'Petugas Security 1', 'Blok F', '6281234567895', 0
FROM organisation_roles r WHERE r.tenant_id = 'a0000000-0000-7000-8000-000000000001'::uuid AND r.title = 'Security' LIMIT 1;
INSERT INTO organisation_members (organisation_role_id, full_name, block_name, whatsapp_number, sort_order)
SELECT r.id, 'Petugas Security 2', 'Blok G', '6281234567896', 1
FROM organisation_roles r WHERE r.tenant_id = 'a0000000-0000-7000-8000-000000000001'::uuid AND r.title = 'Security' LIMIT 1;
INSERT INTO organisation_members (organisation_role_id, full_name, block_name, whatsapp_number, sort_order)
SELECT r.id, 'Petugas Security 3', 'Blok H', '6281234567897', 2
FROM organisation_roles r WHERE r.tenant_id = 'a0000000-0000-7000-8000-000000000001'::uuid AND r.title = 'Security' LIMIT 1;

INSERT INTO organisation_members (organisation_role_id, full_name, block_name, whatsapp_number, sort_order)
SELECT r.id, 'Koordinator Lingkungan', 'Blok I', '6281234567898', 0
FROM organisation_roles r WHERE r.tenant_id = 'a0000000-0000-7000-8000-000000000001'::uuid AND r.title = 'Sesi Lingkungan' LIMIT 1;

INSERT INTO organisation_members (organisation_role_id, full_name, block_name, whatsapp_number, sort_order)
SELECT r.id, 'Koordinator Remaja', 'Blok J', '6281234567899', 0
FROM organisation_roles r WHERE r.tenant_id = 'a0000000-0000-7000-8000-000000000001'::uuid AND r.title = 'Sesi Remaja' LIMIT 1;

INSERT INTO organisation_members (organisation_role_id, full_name, block_name, whatsapp_number, sort_order)
SELECT r.id, 'Koordinator Ibu-ibu', 'Blok K', '6281234567800', 0
FROM organisation_roles r WHERE r.tenant_id = 'a0000000-0000-7000-8000-000000000001'::uuid AND r.title = 'Sesi Ibu-ibu' LIMIT 1;
