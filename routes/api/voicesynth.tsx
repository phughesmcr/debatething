import type { Handlers } from "$fresh/server.ts";
import { agent } from "lib/agent.ts";
import { encodeBase64 } from "@std/encoding";

type Voice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export interface VoiceSynthRequest {
  message: string;
  voice?: Voice;
}

export type VoiceSynthResponse = {
  audio: string;
  error: string | null;
};

const isValidVoice = (voice: string): voice is Voice =>
  ["alloy", "echo", "fable", "onyx", "nova", "shimmer"].includes(voice);

export const handler: Handlers<VoiceSynthRequest | null, unknown> = {
  async POST(req, _ctx) {
    const props = await req.json() as VoiceSynthRequest;

    if (!props || !props.message) {
      const response: VoiceSynthResponse = {
        audio: "", // Empty string instead of ArrayBuffer
        error: !props ? "No props" : "No message",
      };
      return new Response(JSON.stringify(response), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    try {
      console.log("Attempting to synthesize voice with message:", props.message.substring(0, 50) + "...");
      
      if (!agent || !agent.audio || !agent.audio.speech) {
        throw new Error("OpenAI agent is not properly configured");
      }

      if (!props.voice) {
        props.voice = "alloy";
      }

      const voice: Voice = isValidVoice(props.voice) ? props.voice : "alloy";

      const audioResponse = await agent.audio.speech.create({
        model: "tts-1",
        voice,
        input: props.message,
      });

      if (!audioResponse) {
        throw new Error("No response from speech service");
      }

      const audioBuffer = await audioResponse.arrayBuffer();
      const audioBase64 = encodeBase64(new Uint8Array(audioBuffer));
      const response: VoiceSynthResponse = { audio: audioBase64, error: null };
      
      console.log("Voice synthesis successful");
      
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error in voice synthesis:", error);
      
      let errorMessage = "An error occurred during voice synthesis";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      const response: VoiceSynthResponse = {
        audio: "", // Empty string instead of ArrayBuffer
        error: errorMessage,
      };
      
      return new Response(JSON.stringify(response), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};
