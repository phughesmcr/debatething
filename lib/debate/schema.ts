import { voiceTypes } from "routes/api/voicesynth.tsx";
import { z } from "zod";

export const MIN_AGENTS = 2;
export const MAX_AGENTS = 4;
export const MAX_DEBATE_CONTEXT_LENGTH = 1028;
export const MIN_DEBATE_ROUNDS = 1;
export const MAX_DEBATE_ROUNDS = 3;
export const MAX_NAME_LENGTH = 32;
export const MAX_POSITION_LENGTH = 256;
export const MAX_PERSONALITY_LENGTH = 256;

// Define the VoiceType enum
const VoiceTypeEnum = z.enum([...voiceTypes]);

export const AgentDetailsSchema = z.object({
  name: z.string().min(1).max(MAX_NAME_LENGTH),
  personality: z.string().min(1).max(MAX_PERSONALITY_LENGTH),
  stance: z.enum(["for", "against", "undecided", "moderator"]),
  voice: VoiceTypeEnum,
});

export const DebateRequestSchema = z.object({
  position: z.string().min(1).max(MAX_POSITION_LENGTH),
  context: z.string().max(MAX_DEBATE_CONTEXT_LENGTH).default(""),
  numAgents: z.number().int().min(MIN_AGENTS).max(MAX_AGENTS),
  agentDetails: z.array(AgentDetailsSchema),
  uuid: z.string().uuid(),
  numDebateRounds: z.number().int().min(MIN_DEBATE_ROUNDS).max(MAX_DEBATE_ROUNDS),
  moderatorVoice: z.union([z.literal("none"), VoiceTypeEnum]),
}).refine(data => data.agentDetails.length === data.numAgents, {
  message: "Number of agent details must match numAgents",
  path: ["agentDetails"],
});

export type AgentDetails = z.infer<typeof AgentDetailsSchema>;
export type DebateRequest = z.infer<typeof DebateRequestSchema>;
