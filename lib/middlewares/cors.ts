import type { FreshContext } from "$fresh/server.ts";

const ALLOWED_ORIGINS = ["https://debatething.com", "https://www.debatething.com", "https://debate-machine-69-e3582j0hsdtk.deno.dev", "https://debate-machine-69.deno.dev/"];

function setCorsHeaders(headers: Headers, origin: string): void {
  if (ALLOWED_ORIGINS.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With",
    );
    headers.set("Access-Control-Allow-Methods", "POST, GET");
    headers.set("Access-Control-Max-Age", "86400");
  }
}

export default async function handler(req: Request, ctx: FreshContext) {
  const resp = await ctx.next();
  const headers = resp.headers;
  setCorsHeaders(headers, req.headers.get("Origin") || "*");
  return resp;
}
