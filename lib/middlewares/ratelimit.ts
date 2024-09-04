import type { FreshContext } from "$fresh/server.ts";

const WINDOW_SIZE = 60 * 1000; // 1 minute in milliseconds
const MAX_REQUESTS = 100; // Maximum requests per minute

interface RateLimitEntry {
  timestamps: number[];
  lastCleanup: number;
}

interface RateLimitStore {
  [ip: string]: RateLimitEntry;
}
const store: RateLimitStore = {};

function cleanupStoreEntry(ip: string, now: number): void {
  if (!store[ip]) return;

  store[ip].timestamps = store[ip].timestamps.filter((timestamp) => now - timestamp < WINDOW_SIZE);
  store[ip].lastCleanup = now;

  if (store[ip].timestamps.length === 0) {
    delete store[ip];
  }
}

export default async function handler(req: Request, ctx: FreshContext) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();

  if (!store[ip]) {
    store[ip] = { timestamps: [], lastCleanup: now };
  }

  // Perform cleanup if it's been more than WINDOW_SIZE since last cleanup
  if (now - store[ip].lastCleanup >= WINDOW_SIZE) {
    cleanupStoreEntry(ip, now);
  }

  // Ensure the entry exists after cleanup
  if (!store[ip]) {
    store[ip] = { timestamps: [], lastCleanup: now };
  }

  const remaining = MAX_REQUESTS - store[ip].timestamps.length;
  const isRateLimited = remaining <= 0;

  if (isRateLimited) {
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

  store[ip].timestamps.push(now);

  const resp = await ctx.next();
  const headers = resp.headers;

  // Add rate limit info to all responses
  headers.set("X-RateLimit-Limit", MAX_REQUESTS.toString());
  headers.set("X-RateLimit-Remaining", remaining.toString());
  headers.set("X-RateLimit-Reset", (now + WINDOW_SIZE).toString());

  return resp;
}
