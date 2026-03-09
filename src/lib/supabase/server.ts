import { createClient } from "@supabase/supabase-js";

function getSupabaseUrl() {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL is required");
  return url;
}

function getSupabaseServiceKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required");

  // Service role key is a long JWT (eyJ...). Using anon/publishable key here is subject to RLS and causes "row-level security" errors.
  if (key.startsWith("sb_publishable_") || key.startsWith("sb_anon_") || !key.startsWith("eyJ")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY must be the service_role secret (JWT starting with eyJ), not the anon key. " +
        "Get it in Supabase: Project Settings → API → service_role (secret)."
    );
  }
  return key;
}

export function createServerClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
