import { Handlers } from "$fresh/server.ts";
import { conductDebateStream } from "lib/debate/debate.ts";
import { DebateRequestSchema } from "lib/debate/schema.ts";
import { compressJson, kv } from "lib/kv.ts";

export type { AgentDetails, DebateRequest } from "lib/debate/schema.ts";
export type DebateResponse = ReadableStream | { errors: string[] };

export const handler: Handlers = {
  async POST(req, _ctx) {
    const csrfToken = req.headers.get("X-CSRF-Token");

    if (!csrfToken) {
      return new Response(JSON.stringify({ error: "Missing CSRF token" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const input = await req.json();

    const result = DebateRequestSchema.safeParse(input);
    if (!result.success) {
      console.error("Validation errors:", result.error.errors);
      return new Response(JSON.stringify({ errors: result.error.errors.map(e => e.message) }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const validatedInput = result.data;

    try {
      const timestamp = new Date().toISOString();
      const data = JSON.stringify({
        position: validatedInput.position,
        context: validatedInput.context,
        numAgents: validatedInput.numAgents,
        agentDetails: validatedInput.agentDetails,
        numDebateRounds: validatedInput.numDebateRounds,
        moderatorVoice: validatedInput.moderatorVoice,
        timestamp,
      });
      await kv.set(["debates", validatedInput.uuid, timestamp], compressJson(data));
    } catch (error) {
      console.error("Error logging debate details:", error);
    }

    try {
      const stream = await conductDebateStream(validatedInput);
      if (!(stream instanceof ReadableStream)) {
        throw new Error("Invalid stream returned from conductDebateStream");
      }
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache; no-store;",
          "Connection": "keep-alive",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      console.error("Error conducting debate:", error);
      return new Response(
        JSON.stringify({ error: "Failed to conduct debate" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
