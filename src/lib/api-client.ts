/**
 * api-client.ts
 *
 * A thin wrapper around the native `fetch` that dispatches a custom DOM event
 * (`auth:unauthorized`) whenever a response comes back with HTTP 401.
 *
 * WHY THIS EXISTS
 * ───────────────
 * The previous approach in AuthInterceptor.tsx monkey-patched `window.fetch`
 * globally, which is fragile (double-mount risk, conflicts with React 18
 * concurrent features, hard to debug). This module replaces that pattern:
 *
 *  • All authenticated API calls go through `apiFetch` instead of raw `fetch`.
 *  • `AuthInterceptor` (or any component) listens for `auth:unauthorized` and
 *    reacts (e.g. clears session state, redirects to login).
 *  • Callers still receive the original Response so they can read the body,
 *    show error messages, etc.
 *
 * USAGE
 * ─────
 * import { apiFetch } from "@/lib/api-client";
 *
 * const res = await apiFetch("/api/profile");
 * if (res.ok) { ... }
 *
 * The function signature is identical to the native `fetch`, so it is a
 * drop-in replacement at every call-site.
 */

/** Custom event name dispatched when any API call returns HTTP 401. */
export const AUTH_UNAUTHORIZED_EVENT = "auth:unauthorized" as const;

/**
 * Detail payload carried by the `auth:unauthorized` CustomEvent.
 * `url` is the request URL string so listeners can decide whether to act
 * (e.g. suppress the redirect when the 401 came from a login endpoint).
 */
export interface AuthUnauthorizedDetail {
  url: string;
}

/**
 * Dispatch `auth:unauthorized` on `window` (browser only).
 * Safe to call in SSR — the guard prevents any window access on the server.
 */
function dispatchUnauthorized(url: string): void {
  if (typeof window === "undefined") return;
  const detail: AuthUnauthorizedDetail = { url };
  window.dispatchEvent(
    new CustomEvent<AuthUnauthorizedDetail>(AUTH_UNAUTHORIZED_EVENT, {
      detail,
      bubbles: false,
      cancelable: false,
    }),
  );
}

/**
 * Normalise a `RequestInfo | URL` value into a plain string for inspection
 * (e.g. to check whether the URL is a login/auth endpoint).
 */
function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  // Request object
  return input.url;
}

/**
 * Drop-in replacement for `fetch` that:
 *  1. Forwards the call to the native fetch unchanged.
 *  2. Dispatches `auth:unauthorized` on HTTP 401 so that any mounted
 *     AuthInterceptor can clear the session and redirect to login.
 *  3. Always returns the original Response — including on 401 — so callers
 *     can still read the body for error messages (e.g. "PIN salah").
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);

  if (response.status === 401) {
    dispatchUnauthorized(resolveUrl(input));
  }

  return response;
}
