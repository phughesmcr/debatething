import type { DebateRequest } from "routes/api/debate.tsx";

export const MIN_AGENTS = 2;
export const MAX_AGENTS = 4;
export const MAX_DEBATE_CONTEXT_LENGTH = 1028;
export const MIN_DEBATE_ROUNDS = 1;
export const MAX_DEBATE_ROUNDS = 3;
export const MAX_NAME_LENGTH = 32;
export const MAX_POSITION_LENGTH = 256;
export const MAX_PERSONALITY_LENGTH = 256;

export interface InputValidationResponse {
  valid: boolean;
  errors: string[];
}

export function validateDebateInput(input: DebateRequest): InputValidationResponse {
  const errors: string[] = [];

  // Validate position
  if (
    typeof input.position !== "string" || input.position.trim().length === 0
  ) {
    errors.push("Position must be a non-empty string");
  } else if (input.position.length > MAX_POSITION_LENGTH) {
    errors.push(`Position must be ${MAX_POSITION_LENGTH} characters or less`);
  }

  // Validate context
  if (typeof input.context !== "string" || input.context.trim().length === 0) {
    input.context = "";
  } else if (input.context.length > MAX_DEBATE_CONTEXT_LENGTH) {
    errors.push(`Context must be ${MAX_DEBATE_CONTEXT_LENGTH} characters or less`);
  }

  // Validate numAgents
  if (
    !Number.isInteger(input.numAgents) || input.numAgents < MIN_AGENTS ||
    input.numAgents > MAX_AGENTS
  ) {
    errors.push(
      `Number of agents must be an integer between ${MIN_AGENTS} and ${MAX_AGENTS}`,
    );
  }

  // Validate numDebateRounds
  if (
    input.numDebateRounds < MIN_DEBATE_ROUNDS ||
    input.numDebateRounds > MAX_DEBATE_ROUNDS
  ) {
    errors.push(
      `Number of debate rounds must be between ${MIN_DEBATE_ROUNDS} and ${MAX_DEBATE_ROUNDS}`,
    );
  }

  // Validate agentDetails
  if (
    !Array.isArray(input.agentDetails) ||
    input.agentDetails.length !== input.numAgents
  ) {
    errors.push(
      "Participant details must be an array matching the number of agents",
    );
  } else {
    input.agentDetails.forEach((agent, index) => {
      // validate name
      if (typeof agent.name !== "string" || agent.name.trim().length === 0) {
        errors.push(`Participant ${index + 1} name must be a non-empty string`);
      } else if (agent.name.length > MAX_NAME_LENGTH) {
        errors.push(
          `Participant ${index + 1} name must be ${MAX_NAME_LENGTH} characters or less`,
        );
      }

      // validate personality
      if (
        typeof agent.personality !== "string" ||
        agent.personality.trim().length === 0
      ) {
        errors.push(
          `Participant ${index + 1} personality must be a non-empty string`,
        );
      } else if (agent.personality.length > MAX_PERSONALITY_LENGTH) {
        errors.push(
          `Participant ${index + 1} personality must be ${MAX_PERSONALITY_LENGTH} characters or less`,
        );
      }

      // validate voice
      if (typeof agent.voice !== "string" || agent.voice.trim().length === 0) {
        errors.push(`Participant ${index + 1} voice must be a non-empty string`);
      }

      // validate stance
      if (
        typeof agent.stance !== "string" || agent.stance.trim().length === 0 ||
        !["for", "against", "undecided", "moderator"].includes(agent.stance)
      ) {
        errors.push(`Participant ${index + 1} stance is invalid`);
      }
    });
  }

  // Validate UUID
  if (typeof input.uuid !== "string" || input.uuid.trim().length === 0) {
    errors.push("There was an internal error. Refresh the page and try again");
  }

  // Validate moderatorVoice
  if (typeof input.moderatorVoice !== "string" || input.moderatorVoice.trim().length === 0) {
    errors.push("There was an internal error. Refresh the page and try again.");
  }

  return { valid: errors.length === 0, errors };
}
