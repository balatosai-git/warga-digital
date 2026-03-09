import { NextResponse } from "next/server";
import { getSessionFromCookie, clearSessionCookie, destroySession } from "@/lib/auth/session";

/**
 * POST /api/auth/logout
 * Destroys server session and clears session cookie.
 */
export async function POST() {
  try {
    const session = await getSessionFromCookie();
    if (session) {
      await destroySession(session.sessionId);
    }
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Logout] Error:", err);
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  }
}
