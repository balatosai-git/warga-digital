# WARGA DIGITAL — HARDENED CORE SCHEMA (SAME STRUCTURE)

---

## tenants

id (UUID v7, PK)  
name (varchar(150), not null)  
description (varchar(255))  
type (enum: PERUMAHAN, DESA, KOPERASI)  
latitude (decimal(10,8))  
longitude (decimal(11,8))  
status (enum: ACTIVE, SUSPENDED, ARCHIVED)  
created_at (timestamp, not null, default now)  
created_by (uuid, FK → users.id)  
updated_at (timestamp)  
updated_by (uuid, FK → users.id)  

---

## communities  
**Tenant-local community hierarchy (RT / RW / etc.)**

id (UUID v7, PK)  
tenant_id (uuid, FK → tenants.id, not null)  

code (varchar(50), not null)  -- e.g. RT01, RT02, RW14  
name (varchar(150))           -- human friendly label  
level (enum: RT, RW, OTHER)   -- extensible, logical level  

parent_community_id (uuid, FK → communities.id, nullable)  

is_active (boolean, default true)  
created_at (timestamp, not null, default now)  
created_by (uuid, FK → users.id)  
updated_at (timestamp)  
updated_by (uuid, FK → users.id)  

Constraints:
- tenant_id is REQUIRED (no global communities)
- UNIQUE (tenant_id, code)
- parent_community_id must reference SAME tenant
- arbitrary depth hierarchy allowed (RT child of RW, etc.)

Rules:
- A tenant may enable only specific communities (e.g. RT01 only)
- Residents whose houses are in communities NOT enabled for a tenant
  **CANNOT** use that tenant’s platform

---

## houses  
**Represents physical units ONLY (no authority embedded)**

id (UUID v7, PK)  
tenant_id (uuid, FK → tenants.id, not null)  
community_id (uuid, FK → communities.id, not null)  
name (varchar(100), not null)  
blok_rumah (varchar(20), nullable) — house/block code (e.g. N2, J12A); unique per (tenant_id, community_id) when set  
address (varchar(255))  
total_residents (int, default 0)  
status (enum: PRIBADI, KONTRAKAN, KANTOR)  
is_active (boolean, default true)  
created_at (timestamp, not null, default now)  
created_by (uuid, FK → users.id)  
updated_at (timestamp)  
updated_by (uuid, FK → users.id)  

Constraints:
- houses.tenant_id = communities.tenant_id
- UNIQUE (tenant_id, community_id, blok_rumah) WHERE blok_rumah IS NOT NULL

---

## users  
**Global human identity**

id (UUID v7, PK)  
full_name (varchar(150), not null)  

wa_number (varchar, unique when not null) — stored as plain text, normalized (e.g. +628123456789)  
wa_verified_at (timestamp)  

(Residence is in houses + user_houses;)  

email (varchar(150), unique)  
date_of_birth (date)  
status (enum: ACTIVE, INACTIVE, BANNED)  

created_at (timestamp, not null, default now)  
created_by (uuid, FK → users.id)  
updated_at (timestamp)  
updated_by (uuid, FK → users.id)  

Rules:
- wa_number is stored as-is (plain text); lookup and uniqueness by wa_number

---

## tenant_users  
**User’s social existence inside a tenant**

id (UUID v7, PK)  
tenant_id (uuid, FK → tenants.id, not null)  
user_id (uuid, FK → users.id, not null)  

status (enum: ACTIVE, SUSPENDED, BANNED)  
reputation_points (int, default 0)  

joined_at (timestamp, not null, default now)  
left_at (timestamp)  

UNIQUE (tenant_id, user_id)

---

## user_houses  
**All human–house relationships live here**

id (UUID v7, PK)  
tenant_id (uuid, FK → tenants.id, not null)  
user_id (uuid, FK → users.id, not null)  
house_id (uuid, FK → houses.id, not null)  

relationship (enum: OWNER, FAMILY, TENANT, CARETAKER)  
is_primary (boolean, default false)  

move_in_date (date)  
move_out_date (date)  
status (enum: ACTIVE, INACTIVE)  

created_at (timestamp, not null, default now)  
created_by (uuid, FK → users.id)  

Constraints:
- user_houses.tenant_id = houses.tenant_id
- one ACTIVE primary residence per tenant per user

---

## roles  
**Pure RBAC primitives (no authority implied)**

id (int, PK)  
name (varchar(50), unique, not null)  
description (varchar(255))  
scope (enum: SYSTEM, TENANT, HOUSE)  

created_at (timestamp, not null, default now)  
created_by (uuid, FK → users.id)  
updated_at (timestamp)  
updated_by (uuid, FK → users.id)  

Example roles:
- WARGA
- SELLER
- BUYER
- RT_ADMIN
- RW_ADMIN
- KOPERASI_ADMIN
- PLATFORM_ARBITER

---

## tenant_user_roles  
**Multiple roles per tenant-user**

id (UUID v7, PK)  
tenant_user_id (uuid, FK → tenant_users.id, not null)  
role_id (int, FK → roles.id, not null)  

assigned_at (timestamp, not null, default now)  
revoked_at (timestamp)  

UNIQUE (tenant_user_id, role_id, revoked_at IS NULL)

---

## authority_assignments  
**REAL legitimacy (RT / RW / DKM / Satpam)**

id (UUID v7, PK)  
tenant_id (uuid, FK → tenants.id, not null)  
tenant_user_id (uuid, FK → tenant_users.id, not null)  

authority_type (enum: RT, RW, DKM, KOPERASI, SATPAM)  
community_id (uuid, FK → communities.id, not null)  

start_date (date, not null)  
end_date (date)  
status (enum: ACTIVE, REVOKED)  

created_at (timestamp, not null, default now)  
created_by (uuid, FK → users.id)  

Rules:
- authority is time-bound
- authority is tenant-local
- sanctions must reference this table

---

## verifications  
**Trust anchoring by authority**

id (UUID v7, PK)  
tenant_id (uuid, FK → tenants.id, not null)  

entity_type (enum: USER, HOUSE, USER_HOUSE)  
entity_id (uuid, not null)  

verified_by_authority_id (uuid, FK → authority_assignments.id)  
verified_at (timestamp, not null)  
status (enum: VERIFIED, REVOKED)  

---