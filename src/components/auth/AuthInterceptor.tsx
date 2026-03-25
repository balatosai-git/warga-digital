"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

/**
 * A global interceptor for fetch calls that automatically redirects to the login page
 * when receiving a 401 (Unauthorized) response.
 *
 * It ignores 401s from the login/register API endpoints so that error messages
 * (like "PIN salah") can still be handled by the form component itself.
 */
export function AuthInterceptor() {
  const router = useRouter();
  const pathname = usePathname();
  const clearUser = useAuthStore((s) => s.clearUser);

  useEffect(() => {
    // Save the original fetch
    const originalFetch = window.fetch;

    // Monkey-patch window.fetch
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      // Only handle 401 if we're not on the login page and it's not a login/auth check request
      // (to prevent infinite loops or blocking validation messages)
      const isUnauthorized = response.status === 401;
      const url = typeof args[0] === "string" ? args[0] : args[0] instanceof URL ? args[0].href : args[0].url;
      
      const isAuthApi = url.includes("/api/auth/login") || url.includes("/api/auth/check-login");
      const isLoginPage = pathname === "/auth/login";

      if (isUnauthorized && !isAuthApi && !isLoginPage) {
        // Clear local auth state
        clearUser();
        
        // Redirect to login page
        router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
      }

      return response;
    };

    // Cleanup on unmount (though this component usually lives as long as the app)
    return () => {
      window.fetch = originalFetch;
    };
  }, [router, pathname, clearUser]);

  return null;
}
