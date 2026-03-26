"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import {
  AUTH_UNAUTHORIZED_EVENT,
  type AuthUnauthorizedDetail,
} from "@/lib/api-client";

/**
 * AuthInterceptor
 *
 * Listens for the `auth:unauthorized` CustomEvent dispatched by `apiFetch`
 * (src/lib/api-client.ts) whenever any API call returns HTTP 401.
 *
 * On receiving the event it:
 *  1. Clears the local auth state (Zustand + header-profile cookie).
 *  2. Redirects to /auth/login with a `redirect` param so the user lands back
 *     on the page they were trying to access after re-authenticating.
 *
 * WHY NOT window.fetch MONKEY-PATCHING?
 * ──────────────────────────────────────
 * The previous implementation overwrote `window.fetch` globally. That approach
 * is fragile:
 *  • Double-mount in React 18 Strict Mode patches fetch twice and the
 *    cleanup only removes the outermost wrapper, leaving a dangling intercept.
 *  • It conflicts with Suspense and concurrent rendering because React may
 *    invoke renders before the effect runs.
 *  • It makes the fetch call-stack opaque and harder to debug in DevTools.
 *
 * The CustomEvent pattern is:
 *  • Zero global mutation — the native `fetch` is never touched.
 *  • Easy to reason about: apiFetch dispatches → AuthInterceptor handles.
 *  • Safe to mount/unmount multiple times (addEventListener is idempotent
 *    when the same handler reference is used, and cleanup is reliable).
 *
 * IGNORED URLS
 * ────────────
 * Login and auth-check endpoints deliberately return 401 as part of their
 * normal flow (e.g. "PIN salah", "belum login"). Reacting to those 401s
 * would redirect the user away from the login page mid-submission.
 * We suppress the redirect for any URL that includes these prefixes.
 */

/** URL substrings whose 401 responses should NOT trigger a redirect. */
const IGNORED_URL_PATTERNS = [
  "/api/auth/login",
  "/api/auth/check-login",
  "/api/auth/register",
  "/api/auth/otp",
] as const;

function isIgnoredUrl(url: string): boolean {
  return IGNORED_URL_PATTERNS.some((pattern) => url.includes(pattern));
}

export function AuthInterceptor() {
  const router = useRouter();
  const pathname = usePathname();
  const clearUser = useAuthStore((s) => s.clearUser);

  useEffect(() => {
    function handleUnauthorized(
      event: CustomEvent<AuthUnauthorizedDetail>,
    ): void {
      const { url } = event.detail;

      // Don't redirect if we're already on the login page (avoid loops).
      if (pathname === "/auth/login") return;

      // Don't redirect for auth endpoints that legitimately return 401.
      if (isIgnoredUrl(url)) return;

      // Clear local session state so the app doesn't think the user is still
      // logged in after the redirect.
      clearUser();

      // Preserve the current path so the user is sent back here after login.
      router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
    }

    window.addEventListener(
      AUTH_UNAUTHORIZED_EVENT,
      handleUnauthorized as EventListener,
    );

    return () => {
      window.removeEventListener(
        AUTH_UNAUTHORIZED_EVENT,
        handleUnauthorized as EventListener,
      );
    };
  }, [router, pathname, clearUser]);

  // This component renders nothing — it exists purely for its side-effect.
  return null;
}
