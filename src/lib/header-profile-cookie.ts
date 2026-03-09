/**
 * Client-side cookie for landing header: name, profile picture URL, block name.
 * Used so /landing does not re-fetch profile on every visit.
 * Updated whenever profile is loaded or updated (profile page, PATCH, avatar).
 */

const COOKIE_NAME = "wd_header_profile";
const MAX_AGE_DAYS = 7;

export interface HeaderProfileCookie {
  name: string;
  profilePictureUrl: string | null;
  blokRumah: string;
}

export function getHeaderProfileCookie(): HeaderProfileCookie | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + COOKIE_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)")
  );
  const raw = match ? decodeURIComponent(match[1]) : null;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "name" in parsed &&
      typeof (parsed as HeaderProfileCookie).name === "string"
    ) {
      const p = parsed as HeaderProfileCookie;
      return {
        name: p.name,
        profilePictureUrl:
          typeof p.profilePictureUrl === "string"
            ? p.profilePictureUrl
            : p.profilePictureUrl === null
              ? null
              : null,
        blokRumah: typeof p.blokRumah === "string" ? p.blokRumah : "Blok —",
      };
    }
  } catch {
    // ignore
  }
  return null;
}

export function setHeaderProfileCookie(profile: HeaderProfileCookie): void {
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(JSON.stringify(profile));
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function clearHeaderProfileCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}