import { FreshContext } from "$fresh/server.ts";

const CSRF_TOKEN_HEADER = "X-CSRF-Token";
const CSRF_TOKEN_COOKIE = "csrf_token";
const TOKEN_EXPIRATION = 30 * 60 * 1000; // 30 minutes

function generateToken(): string {
  return crypto.randomUUID();
}

function setTokenCookie(headers: Headers, token: string): void {
  headers.set(
    "Set-Cookie",
    `${CSRF_TOKEN_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=${TOKEN_EXPIRATION / 1000}`,
  );
}

export function generateCSRFToken(): string {
  return generateToken();
}

export default async function csrfMiddleware(req: Request, ctx: FreshContext) {
  const url = new URL(req.url);
  const method = req.method.toUpperCase();

  if (method === "GET" && url.pathname === "/api/csrf-token") {
    const token = generateToken();
    const resp = await ctx.next();
    setTokenCookie(resp.headers, token);
    resp.headers.set(CSRF_TOKEN_HEADER, token);
    return resp;
  }

  if (method !== "GET" && method !== "HEAD") {
    const cookieToken = req.headers.get("Cookie")?.match(new RegExp(`${CSRF_TOKEN_COOKIE}=([^;]+)`))?.[1];
    const headerToken = req.headers.get(CSRF_TOKEN_HEADER);

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return new Response("Invalid CSRF token", { status: 403 });
    }
  }

  return await ctx.next();
}
