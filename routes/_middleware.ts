import rateLimiter from "lib/middleswares/ratelimit.ts";
import securityHeaders from "lib/middleswares/securityheaders.ts";
import cors from "lib/middleswares/cors.ts";

export const handler = [securityHeaders, cors, rateLimiter];
