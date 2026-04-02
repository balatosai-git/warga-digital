import type { NextConfig } from "next";

/**
 * Supabase hostname for image optimization.
 * Falls back to the hardcoded value for backward compatibility,
 * but should be set via NEXT_PUBLIC_SUPABASE_URL in production.
 */
function getSupabaseHostname(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (url) {
    try {
      return new URL(url).hostname;
    } catch {
      // If URL parsing fails, fall through to default
    }
  }
  return "bdowfkznkwwveemtpuwg.supabase.co";
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: getSupabaseHostname(),
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
