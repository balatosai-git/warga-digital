# Registration: Blok Rumah & Automatic House/Tenant Provisioning

Registration is **one-step and sufficient**: the user submits name, WhatsApp number, and **blok rumah** (required). The system creates the user, finds or creates the house, and automatically provisions tenant membership, residence (as owner), and default role so that **after OTP verification the user is ready to use the app** with no further flows. Additional profile or address details can be configured later (e.g. settings page, out of scope here).

---

## 1. Blok rumah: fixed canonical format

- **Stored only on** `houses.blok_rumah` (not on `users`).
- **Canonical format:** `BLOCK + NUMBER + optional UNIT` with **no** slash, dot, or space.
  - Pattern: `[A-Z]{1,3}\d{1,4}[A-Z]?` (e.g. `N2`, `J12A`).
- **Normalization** (shared in `src/lib/blok-rumah.ts`):
  - User may type: `N2`, `N/2`, `N.2`, `N 2`, `n2` → all stored as **N2**.
  - `J12A`, `J/12A`, `J.12 A` → **J12A**.
  - Spaces, slashes, and dots are stripped; then uppercase. This avoids duplicate houses for the same unit (e.g. N2 vs N/2).
- **Validation:** After normalization, value must match the canonical regex. Invalid input is rejected with a clear error (frontend and API).
- **Uniqueness:** One house per `(tenant_id, community_id, blok_rumah)` when `blok_rumah` is set.

---

## 2. Blok rumah is required

- **Registration form:** Blok Rumah is a required field. Submit is blocked until it is filled and valid.
- **Register API:** Returns 400 if `blokRumah` is missing or invalid. Provisioning (house + tenant + user_houses + role) **always** runs for every successful registration, so every new user gets full allocation.

---

## 3. Automatic allocation on register (mandatory data)

For every successful registration the API:

1. **User (identity)**  
   - Insert or update `users`: `id`, `full_name`, `wa_number` (plain, normalized), `status` = INACTIVE (OTP sets ACTIVE later). All mandatory fields set.

2. **House (physical unit)**  
   - Lookup by `(tenant_id, community_id, blok_rumah)` with **canonical** blok_rumah.  
   - If not found: INSERT `houses` with `id`, `tenant_id`, `community_id`, `name` = blok_rumah, `blok_rumah`, `status` = PRIBADI, `total_residents` = 0, `is_active` = true, `created_by` = user id.  
   - All NOT NULL and required fields are set; optional (e.g. `address`) left null.

3. **Tenant membership (belonging)**  
   - Upsert `tenant_users`: `tenant_id`, `user_id`, `status` = ACTIVE. Defaults (e.g. `joined_at`, `reputation_points`) applied by DB.

4. **Residence (user ↔ house)**  
   - If the user has no ACTIVE primary for this tenant: INSERT `user_houses` with `tenant_id`, `user_id`, `house_id`, `relationship` = OWNER, `is_primary` = true, `status` = ACTIVE, `created_by` = user id.  
   - If they already have a primary (e.g. re-registration), no second primary row (unique constraint).

5. **Default role**  
   - INSERT `tenant_user_roles`: `tenant_user_id`, `role_id` = WARGA (id 1). Duplicate (e.g. re-register) ignored by unique constraint.

6. **OTP**  
   - Insert `otp_codes`; send OTP; return `userId`.

After the user verifies OTP, `users.status` becomes ACTIVE. No extra steps are required for the user to interact with the app (Identity + Belonging + Residence + default role are already in place).

---

## 4. Mandatory data checklist (all auto-inserted or checked)

| Table | Mandatory / checked | How |
|------|----------------------|-----|
| users | id, full_name, wa_number (plain), status, created_at | Set on insert/update. |
| houses | id, tenant_id, community_id, name, blok_rumah, status, created_at; total_residents, is_active, created_by | Set on insert. address optional. |
| tenant_users | tenant_id, user_id, status; joined_at, reputation_points (defaults) | Upsert. |
| user_houses | id, tenant_id, user_id, house_id, relationship, is_primary, status, created_at, created_by | Set on insert when no primary yet. |
| tenant_user_roles | tenant_user_id, role_id; assigned_at (default) | Insert; duplicate ignored. |
| otp_codes | wa_number_hash, code_hash, expires_at, user_id; created_at (default) | Set on insert. |

Default tenant and community IDs come from seed: `src/lib/constants/seed-ids.ts`. All FKs and NOT NULL columns are satisfied by the register flow.

---

## 5. tenant_users and tenant_user_roles (auto-configured)

- **tenant_users:** One row per (tenant_id, user_id) is upserted on register so the user belongs to the default tenant (status ACTIVE). No manual step.
- **tenant_user_roles:** The default role **WARGA** (id from config) is assigned to that tenant_user so the user has the warga role. Duplicate assign is ignored.

Both use configurable IDs so you can point to your own seeded tenant/community/role.

---

## 6. Configuration (env)

Default tenant, community, and role IDs are read from environment variables so you can match your seeded data or use different values per environment. Copy from `.env.example` into `.env.local` and set:

- `DEFAULT_TENANT_ID` – UUID of the tenant (e.g. Sawangan Regensi).
- `DEFAULT_COMMUNITY_ID` – UUID of the community (e.g. RT 03).
- `DEFAULT_ROLE_WARGA_ID` – Integer role id for WARGA (e.g. 1).

If unset, fallbacks in `src/lib/constants/seed-ids.ts` match the seed migration `20260209000006_seed_default_data.sql`. See `.env.example` for the keys and example values.

---

## 7. Schema and code references

- **houses:** `blok_rumah` VARCHAR(20), unique index `(tenant_id, community_id, blok_rumah)` where `blok_rumah IS NOT NULL`.
- **users:** No `blok_rumah` column.
- **Normalization/validation:** `src/lib/blok-rumah.ts` (`normalizeBlokRumah`, `isValidBlokRumah`, `parseBlokRumah`).
- **Register API:** `src/app/api/auth/register/route.ts` (requires blokRumah; uses `parseBlokRumah`; always calls provisioning).
- **Config:** `src/lib/constants/seed-ids.ts` (reads `DEFAULT_TENANT_ID`, `DEFAULT_COMMUNITY_ID`, `DEFAULT_ROLE_WARGA_ID` from env). Migration: `20260212000002_blok_rumah_on_houses_remove_from_users.sql`.

---

## 8. Related docs

- [core-schema.md](core-schema.md) – houses, users, tenant_users, user_houses.
- [user-registration-flow.md](user-registration-flow.md) – readiness matrix, phases.
