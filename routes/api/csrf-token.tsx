import { Handlers } from "$fresh/server.ts";
import { generateCSRFToken } from "lib/middlewares/csrf.ts";

export const handler: Handlers = {
  GET(_req, _ctx) {
    const token = generateCSRFToken();
    return new Response(null, {
      status: 204,
      headers: {
        "X-CSRF-Token": token,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "X-CSRF-Token",
      },
    });
  },
};
