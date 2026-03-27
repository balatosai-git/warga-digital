/**
 * Default tenant, community, and role IDs for registration auto-provisioning.
 * tenant_users and tenant_user_roles are automatically configured using these values.
 * Set in .env.local (see .env.example). Fallbacks match seed data (Sawangan Regensi RT 03).
 * @see supabase/migrations/20260209000006_seed_default_data.sql
 */

const FALLBACK_TENANT_ID = "a0000000-0000-7000-8000-000000000001";
const FALLBACK_COMMUNITY_ID = "b0000000-0000-7000-8000-000000000002";
const FALLBACK_ROLE_WARGA_ID = 1;
const FALLBACK_ROLE_IDS_CAN_SUBMIT_KAS_RT = [4, 8] as const;
/** Roles that can manage organisation (e.g. edit structure). Default: RT_ADMIN (4), RT_BENDAHARA (8). */
const FALLBACK_ROLE_IDS_CAN_MANAGE_ORGANISATION = [4, 8] as const;
/** Roles that grant access to the admin UI and all /api/admin/* endpoints. Default: RT_ADMIN (4), RW_ADMIN (5). */
const FALLBACK_ROLE_IDS_ADMIN = [4, 5] as const;

function getTenantId(): string {
  const v = process.env.DEFAULT_TENANT_ID?.trim();
  if (v) return v;
  return FALLBACK_TENANT_ID;
}

function getCommunityId(): string {
  const v = process.env.DEFAULT_COMMUNITY_ID?.trim();
  if (v) return v;
  return FALLBACK_COMMUNITY_ID;
}

function getRoleWargaId(): number {
  const v = process.env.DEFAULT_ROLE_WARGA_ID?.trim();
  if (v) {
    const n = parseInt(v, 10);
    if (!Number.isNaN(n)) return n;
  }
  return FALLBACK_ROLE_WARGA_ID;
}

function getRoleIdsCanSubmitKasRt(): number[] {
  const v = process.env.ROLE_IDS_CAN_SUBMIT_KAS_RT?.trim();
  if (v) {
    const ids = v
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));
    if (ids.length > 0) return ids;
  }
  return [...FALLBACK_ROLE_IDS_CAN_SUBMIT_KAS_RT];
}

function getRoleIdsCanManageOrganisation(): number[] {
  const v = process.env.ROLE_IDS_CAN_MANAGE_ORGANISATION?.trim();
  if (v) {
    const ids = v
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));
    if (ids.length > 0) return ids;
  }
  return [...FALLBACK_ROLE_IDS_CAN_MANAGE_ORGANISATION];
}

function getRoleIdsAdmin(): number[] {
  const v = process.env.ROLE_IDS_ADMIN?.trim();
  if (v) {
    const ids = v
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));
    if (ids.length > 0) return ids;
  }
  return [...FALLBACK_ROLE_IDS_ADMIN];
}

export const DEFAULT_TENANT_ID = getTenantId();
export const DEFAULT_COMMUNITY_ID = getCommunityId();
export const DEFAULT_ROLE_WARGA_ID = getRoleWargaId();
export const ROLE_IDS_CAN_SUBMIT_KAS_RT = getRoleIdsCanSubmitKasRt();
export const ROLE_IDS_CAN_MANAGE_ORGANISATION =
  getRoleIdsCanManageOrganisation();
/** Role IDs that grant access to the admin UI and all /api/admin/* endpoints (RT_ADMIN, RT_BENDAHARA). */
export const ROLE_IDS_ADMIN = getRoleIdsAdmin();
