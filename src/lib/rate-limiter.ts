/**
 * Rate Limiter Utility
 *
 * In-memory rate limiter for server-side API routes.
 * Tracks request counts per key within a sliding time window.
 *
 * ⚠️  IMPORTANT: This is an in-memory implementation suitable for
 * single-instance deployments. For multi-instance or serverless
 * deployments, replace with a Redis-backed solution (e.g. @upstash/ratelimit).
 *
 * Usage:
 *   const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 5 });
 *   const result = limiter.consume("user:123:login");
 *   if (!result.allowed) {
 *     return NextResponse.json({ error: "Too many requests" }, {
 *       status: 429,
 *       headers: { "Retry-After": String(result.retryAfterSeconds) }
 *     });
 *   }
 */

export interface RateLimiterConfig {
  /** Time window in milliseconds (default: 60,000 = 1 minute) */
  windowMs: number;
  /** Maximum number of requests allowed per key within the window (default: 5) */
  maxRequests: number;
}

export interface RateLimiterResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of requests remaining in the current window */
  remaining: number;
  /** Total requests allowed per window */
  limit: number;
  /** Seconds until the rate limit resets */
  retryAfterSeconds: number;
  /** Timestamp when the current window resets */
  resetAt: number;
}

interface RateLimitEntry {
  count: number;
  firstRequestAt: number;
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config?: Partial<RateLimiterConfig>) {
    this.windowMs = config?.windowMs ?? 60_000;
    this.maxRequests = config?.maxRequests ?? 5;
    this.startCleanup();
  }

  /**
   * Attempt to consume one request slot for the given key.
   * Returns a RateLimiterResult indicating whether the request is allowed.
   */
  consume(key: string): RateLimiterResult {
    const now = Date.now();
    const entry = this.store.get(key);

    // No existing entry — first request in window
    if (!entry) {
      this.store.set(key, { count: 1, firstRequestAt: now });
      return this.buildResult(key, true, now);
    }

    // Window expired — reset counter
    if (now - entry.firstRequestAt >= this.windowMs) {
      this.store.set(key, { count: 1, firstRequestAt: now });
      return this.buildResult(key, true, now);
    }

    // Window still active — increment counter
    if (entry.count < this.maxRequests) {
      entry.count += 1;
      return this.buildResult(key, true, now);
    }

    // Rate limit exceeded
    return this.buildResult(key, false, now);
  }

  /**
   * Reset the rate limit for a specific key (e.g. after successful login).
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Get current status for a key without consuming a request slot.
   */
  getStatus(key: string): RateLimiterResult {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now - entry.firstRequestAt >= this.windowMs) {
      return {
        allowed: true,
        remaining: this.maxRequests,
        limit: this.maxRequests,
        retryAfterSeconds: 0,
        resetAt: now + this.windowMs,
      };
    }

    const remaining = Math.max(0, this.maxRequests - entry.count);
    const resetAt = entry.firstRequestAt + this.windowMs;
    const retryAfterSeconds = Math.ceil((resetAt - now) / 1000);

    return {
      allowed: entry.count < this.maxRequests,
      remaining,
      limit: this.maxRequests,
      retryAfterSeconds,
      resetAt,
    };
  }

  /**
   * Clear all rate limit entries. Useful for testing.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Stop the automatic cleanup interval.
   * Call this when shutting down the server.
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private buildResult(
    key: string,
    allowed: boolean,
    now: number,
  ): RateLimiterResult {
    const entry = this.store.get(key);

    if (!entry) {
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        limit: this.maxRequests,
        retryAfterSeconds: 0,
        resetAt: now + this.windowMs,
      };
    }

    const resetAt = entry.firstRequestAt + this.windowMs;
    const retryAfterSeconds = Math.ceil((resetAt - now) / 1000);
    const remaining = allowed ? Math.max(0, this.maxRequests - entry.count) : 0;

    return {
      allowed,
      remaining,
      limit: this.maxRequests,
      retryAfterSeconds,
      resetAt,
    };
  }

  /**
   * Periodically remove expired entries to prevent memory leaks.
   * Runs every 5 minutes.
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(
      () => {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
          if (now - entry.firstRequestAt >= this.windowMs) {
            this.store.delete(key);
          }
        }
      },
      5 * 60 * 1000,
    );

    // Allow Node.js to exit even if interval is still running
    if (typeof this.cleanupInterval.unref === "function") {
      this.cleanupInterval.unref();
    }
  }
}

// ─── Pre-configured instances for common use cases ────────────────────────────

/**
 * Strict rate limiter for login attempts.
 * 5 attempts per 5-minute window.
 */
export const loginLimiter = new RateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 5,
});

/**
 * Moderate rate limiter for registration.
 * 3 attempts per 10-minute window.
 */
export const registerLimiter = new RateLimiter({
  windowMs: 10 * 60 * 1000,
  maxRequests: 3,
});

/**
 * OTP-specific rate limiter.
 * 3 attempts per 5-minute window.
 */
export const otpLimiter = new RateLimiter({
  windowMs: 5 * 60 * 1000,
  maxRequests: 3,
});

/**
 * PIN change rate limiter.
 * 3 attempts per 15-minute window.
 */
export const pinChangeLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 3,
});

/**
 * General API rate limiter.
 * 100 requests per minute.
 */
export const generalApiLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
});

/**
 * Helper to build a 429 Too Many Requests response.
 */
import { NextResponse } from "next/server";

/**
 * Helper to build a 429 Too Many Requests response.
 */
export function rateLimitResponse(result: RateLimiterResult) {
  return NextResponse.json(
    {
      error: "Terlalu banyak permintaan. Silakan coba lagi nanti.",
      retryAfter: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.resetAt),
      },
    },
  );
}
