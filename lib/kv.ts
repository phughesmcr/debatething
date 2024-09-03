/// <reference lib="deno.unstable" />
import { compress, decompress } from "brotli";

export const kv = await Deno.openKv();

export const adminKey = Deno.env.get("KV_ADMIN_KEY");

export function compressJson(data: unknown): Uint8Array {
  const jsonStr = JSON.stringify(data);
  const enc = new TextEncoder().encode(jsonStr);
  return compress(enc);
}

export function decompressJson(data: Uint8Array): unknown {
  const dec = decompress(data);
  const decStr = new TextDecoder().decode(dec);
  return JSON.parse(decStr);
}
