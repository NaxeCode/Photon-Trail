type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;

export function enforceRateLimit(key: string, maxPerMinute = Number(process.env.AI_RATE_LIMIT_PER_MINUTE ?? 6)) {
  const limit = Number.isFinite(maxPerMinute) && maxPerMinute > 0 ? maxPerMinute : 6;
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterMs: WINDOW_MS };
  }

  if (current.count >= limit) {
    return { allowed: false, retryAfterMs: current.resetAt - now };
  }

  current.count += 1;
  return { allowed: true, retryAfterMs: current.resetAt - now };
}
