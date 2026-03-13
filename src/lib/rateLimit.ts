/**
 * In-memory rate limit for intake form submissions.
 * On serverless (e.g. Vercel), this is per-instance; resets on cold starts.
 * For multi-instance rate limiting, replace with Vercel KV / Upstash Redis.
 */

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 3;

type Entry = { count: number; windowStart: number };

const store = new Map<string, Entry>();

function prune(ip: string, now: number) {
  const entry = store.get(ip);
  if (!entry) return;
  if (now - entry.windowStart >= WINDOW_MS) {
    store.delete(ip);
  }
}

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  prune(ip, now);

  const entry = store.get(ip);
  if (!entry) {
    return { allowed: true };
  }

  if (now - entry.windowStart >= WINDOW_MS) {
    store.delete(ip);
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000);
    return { allowed: false, retryAfterSeconds: Math.max(1, retryAfterSeconds) };
  }

  return { allowed: true };
}

export function recordSubmission(ip: string): void {
  const now = Date.now();
  prune(ip, now);

  const entry = store.get(ip);
  if (!entry) {
    store.set(ip, { count: 1, windowStart: now });
    return;
  }

  if (now - entry.windowStart >= WINDOW_MS) {
    store.set(ip, { count: 1, windowStart: now });
    return;
  }

  entry.count += 1;
}
