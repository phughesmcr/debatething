import type { FreshContext } from "$fresh/server.ts";

const WINDOW_SIZE = 60 * 1000; // 1 minute in milliseconds
const MAX_REQUESTS = 100; // Maximum requests per minute
const MAX_BLOCKED_TIME = 30 * 60 * 1000; // 30 minutes in milliseconds
const BLOCK_THRESHOLD = 5; // Number of rate limit violations before blocking

interface RateLimitEntry {
  bucket: number;
  lastRequest: number;
  violations: number;
  blockedUntil: number;
}

const store = new Map<string, RateLimitEntry>();

function updateBucket(entry: RateLimitEntry, now: number): void {
  const timePassed = now - entry.lastRequest;
  const tokensToAdd = (timePassed / WINDOW_SIZE) * MAX_REQUESTS;
  entry.bucket = Math.min(MAX_REQUESTS, entry.bucket + tokensToAdd);
  entry.lastRequest = now;
}

export default async function handler(req: Request, ctx: FreshContext) {
  const ip = req.headers.get("x-forwarded-for") || ctx.remoteAddr.hostname || "unknown";
  const now = Date.now();

  let entry = store.get(ip);
  if (!entry) {
    entry = { bucket: MAX_REQUESTS, lastRequest: now, violations: 0, blockedUntil: 0 };
    store.set(ip, entry);
  }

  updateBucket(entry, now);

  if (now < entry.blockedUntil) {
    return new Response(
      JSON.stringify({ error: "IP blocked due to repeated rate limit violations." }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  if (entry.bucket < 1) {
    entry.violations++;
    if (entry.violations >= BLOCK_THRESHOLD) {
      entry.blockedUntil = now + MAX_BLOCKED_TIME;
      return new Response(
        JSON.stringify({ error: "IP blocked due to repeated rate limit violations." }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": MAX_REQUESTS.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": (now + WINDOW_SIZE).toString(),
          "Retry-After": "60",
        },
      },
    );
  }

  entry.bucket -= 1;
  entry.violations = Math.max(0, entry.violations - 1); // Decrease violations count for good behavior

  const resp = await ctx.next();
  const headers = resp.headers;

  headers.set("X-RateLimit-Limit", MAX_REQUESTS.toString());
  headers.set("X-RateLimit-Remaining", Math.floor(entry.bucket).toString());
  headers.set("X-RateLimit-Reset", (now + WINDOW_SIZE).toString());

  return resp;
}
