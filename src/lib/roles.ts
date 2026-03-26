export interface RoleLike {
  name?: string | null;
}

export interface ProfileWithRolesLike {
  roles?: RoleLike[] | null;
  residences?: Array<{ roles?: RoleLike[] | null }> | null;
}

function normalizeRoleName(name: string): string {
  return name.trim().toLowerCase().replace(/[\s_]+/g, "-");
}

export function isAdminRtRoleName(name: string | null | undefined): boolean {
  if (!name) return false;
  const normalized = normalizeRoleName(name);
  return normalized === "admin-rt" || normalized === "rt-admin";
}

export function hasAdminRtRole(roles: RoleLike[] | null | undefined): boolean {
  if (!roles?.length) return false;
  return roles.some((role) => isAdminRtRoleName(role.name));
}

export function hasAdminRtRoleInProfile(profile: ProfileWithRolesLike | null | undefined): boolean {
  if (!profile) return false;
  if (hasAdminRtRole(profile.roles)) return true;
  return (profile.residences ?? []).some((residence) => hasAdminRtRole(residence.roles));
}
