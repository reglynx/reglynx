/**
 * Simple in-memory rate limiter for serverless functions.
 * Not shared across instances — provides per-instance protection only.
 * Sufficient for preventing abuse on public endpoints.
 */

const hits = new Map<string, { count: number; resetAt: number }>();

// Clean up stale entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (entry.resetAt < now) hits.delete(key);
  }
}, 60_000);

/**
 * Check if a request should be rate-limited.
 * @returns null if allowed, or a message string if blocked.
 */
export function checkRateLimit(
  key: string,
  limit: number = 20,
  windowMs: number = 60_000,
): string | null {
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;
  if (entry.count > limit) {
    return `Rate limit exceeded. Try again in ${Math.ceil((entry.resetAt - now) / 1000)} seconds.`;
  }

  return null;
}

/**
 * Extract a rate-limit key from a request (IP-based).
 */
export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  return `rl:${ip}`;
}
