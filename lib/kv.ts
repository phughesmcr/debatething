/// <reference lib="deno.unstable" />

export const kv = await Deno.openKv();

export const adminKey = Deno.env.get("KV_ADMIN_KEY");
