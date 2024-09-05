import type { FreshContext } from "$fresh/server.ts";

const SECURITY_HEADERS = {
  "Cross-Origin-Embedder-Policy": "require-corp",
  //"Cross-Origin-Resource-Policy": "same-origin",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Origin-Agent-Cluster": "?1",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-DNS-Prefetch-Control": "off",
  "X-Download-Options": "noopen",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Permitted-Cross-Domain-Policies": "none",
  "X-XSS-Protection": "0",
  "Permissions-Policy":
    "accelerometer=(), camera=(), encrypted-media=(), gyroscope=(), interest-cohort=(), microphone=(), magnetometer=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), sync-xhr=(), usb=(), xr-spatial-tracking=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; object-src 'none'; media-src 'self' data: blob:; manifest-src 'self';",
  "Expect-CT": "max-age=86400, enforce",
};

function setSecurityHeaders(headers: Headers, path: string): void {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });

  // Set Content-Type for webmanifest
  if (path.endsWith('.webmanifest')) {
    headers.set('Content-Type', 'application/manifest+json');
  }
}

export default async function handler(req: Request, ctx: FreshContext) {
  const resp = await ctx.next();
  const headers = resp.headers;
  const path = new URL(req.url).pathname;
  setSecurityHeaders(headers, path);
  return resp;
}
