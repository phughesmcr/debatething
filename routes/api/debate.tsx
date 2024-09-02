import { Handlers } from "$fresh/server.ts";
import { conductDebateStream } from "lib/debate/debate.ts";
import { validateDebateInput } from "lib/debate/inputValidation.ts";

export interface AgentDetails {
  name: string;
  personality: string;
  stance: "for" | "against" | "undecided" | "moderator";
  voice: string;
  uuid: string;
}

export interface DebateRequest {
  position: string;
  context: string;
  numAgents: number;
  agentDetails: AgentDetails[];
  uuid: string;
  numDebateRounds: number;
  enableModerator: boolean;
}

export type DebateResponse = ReadableStream | { errors: string[] };

export const handler: Handlers = {
  async POST(req) {
    const input = await req.json() as DebateRequest;

    const { errors, valid } = validateDebateInput(input);
    if (!valid) {
      return new Response(JSON.stringify({ errors }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      const stream = await conductDebateStream(input);
      if (!(stream instanceof ReadableStream)) {
        throw new Error("Invalid stream returned from conductDebateStream");
      }
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
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
