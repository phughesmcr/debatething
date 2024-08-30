import { Handlers } from "$fresh/server.ts";
import { conductDebateStream } from "lib/debate.ts";

export const handler: Handlers = {
  async POST(req) {
    const { position, numAgents } = await req.json();

    if (!position || !numAgents) {
      return new Response(JSON.stringify({ error: "Missing position or numAgents" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const stream = await conductDebateStream(position, numAgents);
      return new Response(stream, {
        headers: { "Content-Type": "text/event-stream" },
      });
    } catch (error) {
      console.error("Error conducting debate:", error);
      return new Response(JSON.stringify({ error: "Failed to conduct debate" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};