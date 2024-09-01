import type { Handlers } from "$fresh/server.ts";
import { agent } from "lib/agent.ts";
import { encodeBase64 } from "@std/encoding";

/**
 * @module voicesynth
 * @description This module provides a way to interact with the OpenAI TTS API.
 */

/** The type of voices available for synthesis. */
export type VoiceType =
  | "alloy"
  | "echo"
  | "fable"
  | "onyx"
  | "nova"
  | "shimmer";

/** The list of voices available for synthesis. */
export const voiceTypes: VoiceType[] = [
  "alloy",
  "echo",
  "fable",
  "onyx",
  "nova",
  "shimmer",
] as const;

/** The default voice to use for synthesis. */
export const DEFAULT_VOICE: VoiceType = "alloy";

/** The default TTS model to use for synthesis. */
export const DEFAULT_VOICE_MODEL: string = "tts-1";

/** The request object for the voice synthesis API. */
export interface VoiceSynthRequest {
  /** The text of the message to be synthesized. */
  message: string;
  /**
   * The voice to use for synthesis.
   * @default "alloy"
   */
  voice?: VoiceType;
}

/** The response object for the voice synthesis API. */
export type VoiceSynthResponse = {
  audio: string;
  error: string | null;
};

/** Type guard to check if a voice is valid. */
export const isValidVoice = (voice: string): voice is VoiceType => voiceTypes.includes(voice as VoiceType);

/** Type guard to check if a voice synthesis request is valid. */
export const isValidVoiceSynthRequest = (
  req: VoiceSynthRequest,
): req is VoiceSynthRequest => {
  return typeof req.message === "string" && req.message.trim().length > 0 &&
    (req.voice === undefined ||
      (typeof req.voice === "string" && isValidVoice(req.voice)));
};

export const responseToBase64 = async (response: Response): Promise<string> => {
  const audioBuffer = await response.arrayBuffer();
  return encodeBase64(new Uint8Array(audioBuffer));
};

/** The route handler for the voice synthesis API. */
export const handler: Handlers<VoiceSynthRequest | null, unknown> = {
  async POST(req, _ctx) {
    const props = await req.json() as VoiceSynthRequest;

    if (!isValidVoiceSynthRequest(props)) {
      return new Response(
        JSON.stringify({
          audio: "",
          error: "Invalid voice synthesis request.",
        } as VoiceSynthResponse),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    try {
      if (!agent || !agent.audio || !agent.audio.speech) {
        throw new Error("OpenAI agent is not properly configured");
      }

      props.voice = props.voice || DEFAULT_VOICE;
      const voice: VoiceType = isValidVoice(props.voice) ? props.voice : DEFAULT_VOICE;

      const audioResponse = await agent.audio.speech.create({
        model: DEFAULT_VOICE_MODEL,
        voice: voice.toLowerCase().trim() as VoiceType,
        input: props.message,
      });

      if (!audioResponse) {
        throw new Error("No response from speech service");
      }

      const contentType = audioResponse.headers.get('content-type');
      const audioFormat = contentType ? contentType.split('/')[1] : 'mp3';

      // Return the audio data as an ArrayBuffer instead of base64
      const audioBuffer = await audioResponse.arrayBuffer();

      return new Response(
        audioBuffer,
        {
          status: 200,
          headers: { 
            "Content-Type": `audio/${audioFormat}`,
            "Content-Disposition": "attachment; filename=speech.mp3"
          },
        },
      );
    } catch (error) {
      console.error("Error in voice synthesis:", error);

      let errorMessage = "An error occurred during voice synthesis";
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
