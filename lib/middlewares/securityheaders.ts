import type { FreshContext } from "$fresh/server.ts";
import { encodeHex } from "@std/encoding/hex";
import { md5 } from "@takker/md5";

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
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; object-src 'none'; upgrade-insecure-requests; frame-ancestors 'none'; connect-src 'self' https://api.openai.com; media-src 'self' data: blob:; manifest-src 'self';",
  "Expect-CT": "max-age=86400, enforce",
};

function setSecurityHeaders(headers: Headers, path: string): void {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });

  // Set Content-Type
  if (path.endsWith(".webmanifest")) {
    headers.set("Content-Type", "application/manifest+json");
  }
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) {
    headers.set("Content-Type", "image/jpeg");
  }
  if (path.endsWith(".png")) {
    headers.set("Content-Type", "image/png");
  }
  if (path.endsWith(".svg")) {
    headers.set("Content-Type", "image/svg+xml");
  }
  if (path.endsWith(".json")) {
    headers.set("Content-Type", "application/json; charset=utf-8");
  }
  if (path.endsWith(".html")) {
    headers.set("Content-Type", "text/html; charset=utf-8");
  }
  if (path.endsWith(".css")) {
    headers.set("Content-Type", "text/css; charset=utf-8");
  }
  if (path.endsWith(".js")) {
    headers.set("Content-Type", "application/javascript; charset=utf-8");
  }
  if (path.endsWith(".mp3")) {
    headers.set("Content-Type", "audio/mpeg");
  }

  // cache control
  if (path.endsWith('.css') || path.endsWith('.js') || path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.svg')) {
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // ETag for CSS and JS files
  if (path.endsWith('.css') || path.endsWith('.js')) {
    const hash = encodeHex(md5(path + Date.now().toString()));
    headers.set('ETag', `"${hash}"`);
  }
}

export default async function handler(req: Request, ctx: FreshContext) {
  const resp = await ctx.next();
  const headers = resp.headers;
  const path = new URL(req.url).pathname;
  if (path.startsWith("/_frsh/")) {
    return resp;
  }
  setSecurityHeaders(headers, path);
  return resp;
}
