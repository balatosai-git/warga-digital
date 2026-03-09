# WARGA DIGITAL — USER REGISTRATION → ACTIVE USAGE FLOW
*(Strictly aligned with Hardened Core Schema)*

---

## 1. Core Principles

The system enforces **layered legitimacy**:

1. **Identity** → global human (`users`)
2. **Belonging** → social existence in a tenant (`tenant_users`)
3. **Presence** → physical anchoring (`user_houses`)
4. **Trust** → verification by authority (`verifications`)
5. **Power** → time-bound legitimacy (`authority_assignments`)

> A user is considered **ACTIVE & READY TO USE** after **Layer 3**.

---

## 2. Phase 0 — Tenant Availability (Precondition)

- `tenants.status = ACTIVE`
- Houses may already exist or be created later
- No user can proceed if tenant is SUSPENDED or ARCHIVED

### 2.1 Tenant–Community Scope

- Each tenant defines its **local community hierarchy** in `communities`  
  - Examples: RT01, RT02, RT03 under RW14  
  - Parent/child allowed (e.g. RT child of RW)
- `communities.tenant_id = tenants.id` (tenant-local only)
- `houses.community_id` must reference a `communities.id` **of the same tenant**

**Access Rule:**
- A resident may only register & use a tenant **if their primary house’s community**
  (`houses.community_id`) is one of the communities registered for that tenant.
- Example: if tenant only registers RT01:
  - Residents in RT01 → allowed
  - Residents in RT02 / RT03 (or other communities) → **blocked from this tenant**

---

## 3. Phase 1 — Global User Registration (Identity Layer)

### Goal
Create a unique, global human identity.

### User Input
- `full_name`
- `wa_number`
- `blok_rumah` (required); canonical format e.g. N2, J12A (N/2, N.2, N 2 normalized to N2); house and tenant membership are always auto-provisioned — see [registration-blok-rumah-house-provisioning.md](registration-blok-rumah-house-provisioning.md)
- optional: `email`, `date_of_birth`

### System Actions
- Store `wa_number` as plain text (normalized, e.g. +628123456789)
- Send WhatsApp OTP
- Lookup existing user by `wa_number`

### Database Write (Initial)
```sql
INSERT INTO users (
  id,
  full_name,
  wa_number,
  status,
  created_at
) VALUES (
  UUIDv7(),
  :full_name,
  :wa_number_normalized,
  'INACTIVE',
  NOW()
);

### OTP Verification

UPDATE users
SET
  wa_verified_at = NOW(),
  status = 'ACTIVE'
WHERE id = :user_id;

Result:
- User exists globally
- Not yet part of any tenant

## 4. Phase 4 — Authority Assignment (Power Layer)

### Goal
Grant **real, time-bound, and revocable legitimacy** to a tenant user.

Authority represents **community power**, not capability.  
It is always:
- Tenant-local
- Time-bound
- Explicitly revocable

---

### Example: Assign RT Authority

**Preconditions**
- `tenant_users.status = ACTIVE`
- User is already part of the tenant
- Authority granter has sufficient legitimacy

**Database Write**
INSERT INTO authority_assignments (
  id,
  tenant_id,
  tenant_user_id,
  authority_type,
  community_id,
  start_date,
  status,
  created_at
) VALUES (
  UUIDv7(),
  :tenant_id,
  :tenant_user_id,
  'RT',
  :community_id,   -- FK → communities.id (e.g. RT05 under RW14)
  CURRENT_DATE,
  'ACTIVE',
  NOW()
);

---

### Authority Revocation

Authority is never deleted, only revoked.

**Database Update**
UPDATE authority_assignments
SET
  status = 'REVOKED',
  end_date = CURRENT_DATE
WHERE id = :authority_id;

---

### Authority Rules
- One authority may expire naturally (`end_date`)
- Multiple authorities may exist historically
- Only one ACTIVE authority of the same type per scope
- Sanctions must reference an authority record

---

## 5. Readiness Matrix

Defines when a user is considered **ACTIVE & READY TO USE**.

| Layer        | Table                 | Required | Status Condition              |
|-------------|-----------------------|----------|-------------------------------|
| Identity     | users                 | Yes      | status = ACTIVE               |
| Belonging    | tenant_users          | Yes      | status = ACTIVE               |
| Residence    | user_houses           | Yes      | ACTIVE + is_primary = true    |
| Verification | verifications         | No       | Optional                       |
| Authority    | authority_assignments | No       | Optional                       |

**Minimum viable activation:**  
Identity + Belonging + Residence

---

## 6. Exit, Suspension, and Leaving Rules

### User Leaves Tenant

When a user leaves or is removed from a tenant:

UPDATE tenant_users
SET
  status = 'SUSPENDED',
  left_at = NOW()
WHERE id = :tenant_user_id;

UPDATE user_houses
SET
  status = 'INACTIVE'
WHERE
  user_id = :user_id
  AND tenant_id = :tenant_id;

---

### Effects of Leaving
- User remains globally ACTIVE
- Tenant participation is suspended
- All authority assignments become invalid by reference
- Historical data is preserved

---