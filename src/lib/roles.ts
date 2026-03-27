/**
 * Role-check utilities for admin access control.
 *
 * ADMIN_ROLE_NAMES lists every normalized role name that grants access to the
 * admin UI and API.  Normalization rule: trim → lowercase → spaces/underscores → hyphens.
 *
 * Roles included:
 *   • RT_ADMIN (id 4) — primary RT administrator
 *   • RW_ADMIN (id 5) — RW-level administrator
 *
 * ⚠  "admin-rt" is intentionally ABSENT — no such role exists in the database.
 *     The canonical name is RT_ADMIN, which normalises to "rt-admin".
 */
const ADMIN_ROLE_NAMES = new Set(["rt-admin", "rw-admin"]);

export interface RoleLike {
  name?: string | null;
}

export interface ProfileWithRolesLike {
  roles?: RoleLike[] | null;
  residences?: Array<{ roles?: RoleLike[] | null }> | null;
}

function normalizeRoleName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");
}

/** Returns true when the given role name belongs to any admin role. */
export function isAdminRoleName(name: string | null | undefined): boolean {
  if (!name) return false;
  return ADMIN_ROLE_NAMES.has(normalizeRoleName(name));
}

/** Returns true when the given roles array contains at least one admin role. */
export function hasAdminRole(roles: RoleLike[] | null | undefined): boolean {
  if (!roles?.length) return false;
  return roles.some((role) => isAdminRoleName(role.name));
}

/**
 * Returns true when the profile (or any of its residences) holds an admin role.
 *
 * Deliberately checks BOTH `profile.roles` (top-level convenience field) AND
 * every entry in `profile.residences[n].roles` so multi-residence users are
 * handled correctly regardless of which residence appears first.
 */
export function hasAdminRoleInProfile(
  profile: ProfileWithRolesLike | null | undefined,
): boolean {
  if (!profile) return false;
  if (hasAdminRole(profile.roles)) return true;
  return (profile.residences ?? []).some((residence) =>
    hasAdminRole(residence.roles),
  );
}

// ─── Backward-compatible aliases ──────────────────────────────────────────────
// Kept so existing callers continue to compile while they are migrated to the
// new names above.  Remove once every import has been updated.

/** @deprecated Use {@link isAdminRoleName} */
export const isAdminRtRoleName = isAdminRoleName;
/** @deprecated Use {@link hasAdminRole} */
export const hasAdminRtRole = hasAdminRole;
/** @deprecated Use {@link hasAdminRoleInProfile} */
export const hasAdminRtRoleInProfile = hasAdminRoleInProfile;
