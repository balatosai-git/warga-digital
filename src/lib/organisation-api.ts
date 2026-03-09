/**
 * Shared types and helpers for organisation API.
 * Response shape matches what the organisasi page and manage page consume.
 */

export interface OrganisationMemberApi {
  id: string;
  /** When null, slot is "Vacant" (role exists but no assignee). */
  userId: string | null;
  fullName: string;
  blockName: string;
  whatsappNumber: string;
  profilePictureUrl: string | null;
  sortOrder: number;
}

export interface OrganisationRoleApi {
  id: string;
  title: string;
  sortOrder: number;
  members: OrganisationMemberApi[];
}

export interface OrganisationTreeApi {
  roles: OrganisationRoleApi[];
}
