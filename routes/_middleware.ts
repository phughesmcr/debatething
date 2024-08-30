import type { FreshContext } from "$fresh/server.ts";

const WINDOW_SIZE = 60 * 1000; // 1 minute in milliseconds
const MAX_REQUESTS = 10; // Maximum requests per minute

interface RateLimitEntry {
  timestamps: number[];
  lastCleanup: number;
}

interface RateLimitStore {
  [ip: string]: RateLimitEntry;
}
const store: RateLimitStore = {};

const SECURITY_HEADERS = {
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Origin-Agent-Cluster": "?1",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "X-DNS-Prefetch-Control": "off",
    "X-Download-Options": "noopen",
    "X-Frame-Options": "DENY",
    "X-Permitted-Cross-Domain-Policies": "none",
    "X-XSS-Protection": "0",
    "Permissions-Policy":
      "accelerometer=(), camera=(), document-domain=(), encrypted-media=(), gyroscope=(), interest-cohort=(), microphone=(), magnetometer=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), sync-xhr=(), usb=(), xr-spatial-tracking=(), geolocation=()",
    "Content-Security-Policy":
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; object-src 'none'",
  };
  
  function setSecurityHeaders(headers: Headers): void {
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }
  
  function setCorsHeaders(headers: Headers, origin: string): void {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With",
    );
    headers.set("Access-Control-Allow-Methods", "POST, GET");
  }

  export async function handler(req: Request, ctx: FreshContext) {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const now = Date.now();

    if (!store[ip]) {
      store[ip] = { timestamps: [], lastCleanup: now };
    }

    // Perform cleanup if it's been more than WINDOW_SIZE since last cleanup
    if (now - store[ip].lastCleanup >= WINDOW_SIZE) {
      cleanupStoreEntry(ip, now);
    }

    const remaining = MAX_REQUESTS - store[ip].timestamps.length;
    const isRateLimited = remaining <= 0;

    if (isRateLimited) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": MAX_REQUESTS.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": (now + WINDOW_SIZE).toString(),
        },
      });
    }

    store[ip].timestamps.push(now);

    const resp = await ctx.next();
    const headers = resp.headers;

    // Add rate limit info to all responses
    headers.set("X-RateLimit-Limit", MAX_REQUESTS.toString());
    headers.set("X-RateLimit-Remaining", remaining.toString());
    headers.set("X-RateLimit-Reset", (now + WINDOW_SIZE).toString());

    setSecurityHeaders(headers);
    setCorsHeaders(headers, req.headers.get("Origin") || "*");

    return resp;
  }

  function cleanupStoreEntry(ip: string, now: number): void {
    if (!store[ip]) return;
    
    store[ip].timestamps = store[ip].timestamps.filter(timestamp => now - timestamp < WINDOW_SIZE);
    store[ip].lastCleanup = now;
    
    if (store[ip].timestamps.length === 0) {
      delete store[ip];
    }
  }
