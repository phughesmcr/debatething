interface AgentDetails {
    name: string;
    personality: string;
  }
  
  interface DebateInput {
    position: string;
    numAgents: number;
    agentDetails: AgentDetails[];
  }
  
  export const MIN_AGENTS = 2;
  export const MAX_AGENTS = 4;
  export const MAX_DEBATE_CONTEXT_LENGTH = 1028;
  export const MAX_NAME_LENGTH = 32;
  export const MAX_POSITION_LENGTH = 128;
  export const MAX_PERSONALITY_LENGTH = 264;
  
  export function validateDebateInput(input: DebateInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
  
    // Validate position
    if (typeof input.position !== 'string' || input.position.trim().length === 0) {
      errors.push('Position must be a non-empty string');
    } else if (input.position.length > MAX_POSITION_LENGTH) {
      errors.push(`Position must be ${MAX_POSITION_LENGTH} characters or less`);
    }
  
    // Validate numAgents
    if (!Number.isInteger(input.numAgents) || input.numAgents < MIN_AGENTS || input.numAgents > MAX_AGENTS) {
      errors.push(`Number of agents must be an integer between ${MIN_AGENTS} and ${MAX_AGENTS}`);
    }
  
    // Validate agentDetails
    if (!Array.isArray(input.agentDetails) || input.agentDetails.length !== input.numAgents) {
      errors.push('Agent details must be an array matching the number of agents');
    } else {
      input.agentDetails.forEach((agent, index) => {
        if (typeof agent.name !== 'string' || agent.name.trim().length === 0) {
          errors.push(`Agent ${index + 1} name must be a non-empty string`);
        } else if (agent.name.length > MAX_NAME_LENGTH) {
          errors.push(`Agent ${index + 1} name must be ${MAX_NAME_LENGTH} characters or less`);
        }
  
        if (typeof agent.personality !== 'string' || agent.personality.trim().length === 0) {
          errors.push(`Agent ${index + 1} personality must be a non-empty string`);
        } else if (agent.personality.length > MAX_PERSONALITY_LENGTH) {
          errors.push(`Agent ${index + 1} personality must be ${MAX_PERSONALITY_LENGTH} characters or less`);
        }
      });
    }
  
    return { valid: errors.length === 0, errors };
  }