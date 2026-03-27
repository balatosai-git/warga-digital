import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/auth/jwt";

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_COOKIE = "wd_session";

/**
 * Page paths that are accessible without a session cookie.
 * Exact match only — sub-paths like /auth/login/foo are NOT automatically
 * included; add them explicitly if needed.
 */
const PUBLIC_PAGE_PATHS = new Set([
  "/",
  "/onboarding",
  "/auth/login",
  "/auth/register",
  "/auth/otp",
  "/auth/set-pin",
  "/auth/add-family",
]);

/**
 * URL prefixes that are always allowed through without any auth check.
 *
 * • /api/auth/  — login, register, OTP, set-pin flows need to be reachable
 *                 before a session exists.
 * • /_next/     — Next.js build artefacts (handled by matcher, but kept as
 *                 a safety net).
 */
const ALWAYS_ALLOW_PREFIXES = ["/api/auth/"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a login redirect URL, preserving the original destination so the
 * user is sent back after authenticating.
 *
 * The redirect param is omitted for "/" to avoid a meaningless ?redirect=/
 * in the URL bar.
 */
function buildLoginRedirect(request: NextRequest): URL {
  const loginUrl = new URL("/auth/login", request.url);
  const { pathname, search } = request.nextUrl;

  if (pathname !== "/") {
    const destination = pathname + search;
    loginUrl.searchParams.set("redirect", destination);
  }

  return loginUrl;
}

/**
 * Return true when the path is an API route (starts with /api/).
 * API callers receive a JSON 401 rather than an HTML redirect so that
 * apiFetch / AuthInterceptor can handle the response programmatically.
 */
function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Edge-compatible authentication middleware.
 *
 * WHAT IT DOES
 * ────────────
 * 1. Lets public pages and /api/auth/* through unconditionally.
 * 2. For every other request it reads the `wd_session` cookie and verifies
 *    the JWT signature using `jose` (no DB call — zero extra latency).
 * 3. Unauthenticated page requests  → 302 redirect to /auth/login.
 *    Unauthenticated API requests   → 401 JSON { error: "Unauthorized" }.
 * 4. Authenticated requests receive two extra request headers so that
 *    API route handlers can read the already-verified identity without
 *    re-parsing the token:
 *      x-user-id    — UUID of the authenticated user
 *      x-session-id — UUID of the session record
 *    (Full DB session validation still happens inside getSessionFromCookie()
 *    for every API route — the headers are an optimisation hint only.)
 *
 * WHY NO DB CALL
 * ──────────────
 * Middleware runs on the Edge runtime before every request. A Supabase round
 * trip here would add 50–200 ms to every page load. JWT verification with
 * jose is ~1 ms and requires no network I/O. The trade-off is that a manually
 * revoked session (e.g. after logout) would still pass the middleware check
 * until the token expires — but every API route calls getSessionFromCookie()
 * which does hit the DB and will correctly reject revoked sessions there.
 *
 * ADMIN ROLE ENFORCEMENT
 * ──────────────────────
 * The middleware does NOT check roles — that would require a DB call.
 * Role enforcement for /admin pages is layered:
 *   • Client layer  : admin page fetches /api/profile, checks hasAdminRoleInProfile(),
 *                     redirects non-admins to /landing before any data is shown.
 *   • API layer     : /api/admin/stats (and every other admin API) verifies the
 *                     RT_ADMIN / RT_BENDAHARA role server-side via requireAdmin() and returns 403.
 * This means the admin page shell HTML is served to any authenticated user,
 * but no privileged data is ever returned to non-admins.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // ── 1. Unconditionally allowed prefixes ──────────────────────────────────
  for (const prefix of ALWAYS_ALLOW_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return NextResponse.next();
    }
  }

  // ── 2. Public pages ──────────────────────────────────────────────────────
  if (PUBLIC_PAGE_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // ── 3. Verify session JWT ────────────────────────────────────────────────
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return unauthenticated(request);
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    // Token is malformed, tampered, or expired.
    return unauthenticated(request);
  }

  // ── 4. Pass through with identity headers ────────────────────────────────
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-user-id", payload.userId);
  requestHeaders.set("x-session-id", payload.sessionId);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

/**
 * Produce the correct unauthenticated response depending on whether the
 * request is for an API route or a page route.
 */
function unauthenticated(request: NextRequest): NextResponse {
  if (isApiRoute(request.nextUrl.pathname)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.redirect(buildLoginRedirect(request));
}

// ─── Matcher ──────────────────────────────────────────────────────────────────

/**
 * Run middleware on every path EXCEPT:
 *  • Next.js static build output (_next/static, _next/image)
 *  • Files with an extension (.ico, .png, .svg, .woff2, …)
 *
 * The negative lookahead `(?!...)` keeps static asset serving fast by
 * skipping the middleware entirely for those paths.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot|mp4|webm)$).*)",
  ],
};
