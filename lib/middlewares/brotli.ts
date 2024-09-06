import type { FreshContext } from "$fresh/server.ts";
import { compress } from "brotli";

export default async function brotliMiddleware(req: Request, ctx: FreshContext) {
  const resp = await ctx.next();
  const headers = resp.headers;

  // Skip compression for event streams
  if (headers.get("Content-Type") === "text/event-stream" || headers.get("Content-Type")?.includes("javascript")) {
    return resp;
  }

  // Check if the client accepts Brotli compression
  const acceptEncoding = req.headers.get("accept-encoding");
  if (acceptEncoding && acceptEncoding.includes("br")) {
    const body = await resp.arrayBuffer();

    // Only compress if there's a body to compress
    if (body.byteLength > 0) {
      const compressedBody = compress(new Uint8Array(body));

      headers.set("Content-Encoding", "br");
      headers.set("Content-Length", compressedBody.length.toString());

      return new Response(compressedBody, {
        status: resp.status,
        statusText: resp.statusText,
        headers,
      });
    }
  }

  return resp;
}
