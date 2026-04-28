/**
 * Production-grade rate limiter for Next.js API routes.
 * Uses sliding window with automatic cleanup. Works in-memory for standalone
 * deployments. For multi-instance, swap the store adapter.
 */

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
}

interface RateLimitEntry {
  timestamps: number[];
}

export function createRateLimiter(config: RateLimitConfig) {
  const { maxRequests, windowMs } = config;
  const store = new Map<string, RateLimitEntry>();

  // Periodic cleanup every 5 minutes to prevent memory leaks
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      // Remove entries where all timestamps are outside the window
      const validTimestamps = entry.timestamps.filter(t => now - t < windowMs);
      if (validTimestamps.length === 0) {
        store.delete(key);
      } else {
        entry.timestamps = validTimestamps;
      }
    }
  }, 5 * 60 * 1000);

  // Allow cleanup to not keep the process alive
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  function check(key: string): RateLimitResult {
    const now = Date.now();
    let entry = store.get(key);

    if (!entry) {
      entry = { timestamps: [] };
      store.set(key, entry);
    }

    // Remove timestamps outside the sliding window
    entry.timestamps = entry.timestamps.filter(t => now - t < windowMs);

    const resetAt = entry.timestamps.length > 0
      ? entry.timestamps[0] + windowMs
      : now + windowMs;

    if (entry.timestamps.length >= maxRequests) {
      const retryAfterMs = entry.timestamps[0] + windowMs - now;
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfterMs: Math.max(retryAfterMs, 0),
      };
    }

    entry.timestamps.push(now);
    return {
      allowed: true,
      remaining: maxRequests - entry.timestamps.length,
      resetAt,
    };
  }

  function cleanup() {
    clearInterval(cleanupInterval);
    store.clear();
  }

  return { check, cleanup };
}

/** Extract client IP from request headers (handles proxies). */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0]?.trim();
    if (firstIp) return firstIp;
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  // Fallback: use a hash of the user-agent + accept headers as pseudo-identifier
  const ua = req.headers.get('user-agent') || '';
  const accept = req.headers.get('accept') || '';
  return `anonymous-${hashString(ua + accept)}`;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/** Create standard rate limit response headers. */
export function rateLimitHeaders(result: RateLimitResult, limit: number): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  };
  if (!result.allowed && result.retryAfterMs !== undefined) {
    headers['Retry-After'] = String(Math.ceil(result.retryAfterMs / 1000));
  }
  return headers;
}
