import cors from "lib/middlewares/cors.ts";
import csrf from "lib/middlewares/csrf.ts";
import rateLimiter from "lib/middlewares/ratelimit.ts";
import securityHeaders from "lib/middlewares/securityheaders.ts";

export const handler = [securityHeaders, cors, rateLimiter, csrf];
