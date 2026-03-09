import { cookies } from "next/headers";
import { createServerClient } from "@/lib/supabase/server";
import { signSessionToken, verifySessionToken } from "./jwt";
import { hashSha256 } from "@/lib/crypto";
import { uuidv7 } from "uuidv7";

const SESSION_COOKIE = "wd_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function hashToken(token: string): string {
  return hashSha256(token);
}

export async function createSession(userId: string): Promise<string> {
  const supabase = createServerClient();
  const sessionId = uuidv7();
  const rawToken = crypto.randomUUID() + crypto.randomUUID();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  await supabase.from("sessions").insert({
    id: sessionId,
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
    last_active_at: new Date().toISOString(),
  });

  const jwt = await signSessionToken(sessionId, userId);
  return jwt;
}

export async function setSessionCookie(jwt: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function getSessionFromCookie(): Promise<{
  userId: string;
  sessionId: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const supabase = createServerClient();
  const { data: session } = await supabase
    .from("sessions")
    .select("id, user_id, expires_at")
    .eq("id", payload.sessionId)
    .single();

  if (!session || new Date(session.expires_at) < new Date()) {
    return null;
  }

  return { userId: payload.userId, sessionId: payload.sessionId };
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function destroySession(sessionId: string) {
  const supabase = createServerClient();
  await supabase.from("sessions").delete().eq("id", sessionId);
}
