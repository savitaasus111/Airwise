interface RateBucket {
  count: number;
  resetAt: number;
}

const MAX_BUCKETS = 2000;
const buckets = new Map<string, RateBucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

function pruneAndCapBuckets(now: number): void {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [k, v] of buckets.entries()) {
    if (v.resetAt <= now) buckets.delete(k);
  }
  while (buckets.size >= MAX_BUCKETS) {
    const oldestKey = buckets.keys().next().value;
    if (oldestKey === undefined) break;
    buckets.delete(oldestKey);
  }
}

/**
 * Bounded sliding-window in-memory rate limiter for API route protection.
 * Hard-caps total stored keys to prevent memory exhaustion under spoofed-IP floods.
 */
export function checkRateLimit(key: string, limit = 30, windowMs = 60_000): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.delete(key);
    pruneAndCapBuckets(now);
    const fresh: RateBucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt: fresh.resetAt };
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim().slice(0, 64) || 'anonymous-client';
  }
  return (request.headers.get('x-real-ip') || 'anonymous-client').trim().slice(0, 64);
}

export function resetRateLimits(): void {
  buckets.clear();
}
