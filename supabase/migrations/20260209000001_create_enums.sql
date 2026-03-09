-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
