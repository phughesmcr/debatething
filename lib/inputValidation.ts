interface AgentDetails {
    name: string;
    personality: string;
  }
  
  interface DebateInput {
    position: string;
    numAgents: number;
    agentDetails: AgentDetails[];
  }
  
  export function validateDebateInput(input: DebateInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
  
    // Validate position
    if (typeof input.position !== 'string' || input.position.trim().length === 0) {
      errors.push('Position must be a non-empty string');
    } else if (input.position.length > 500) {
      errors.push('Position must be 500 characters or less');
    }
  
    // Validate numAgents
    if (!Number.isInteger(input.numAgents) || input.numAgents < 2 || input.numAgents > 4) {
      errors.push('Number of agents must be an integer between 2 and 4');
    }
  
    // Validate agentDetails
    if (!Array.isArray(input.agentDetails) || input.agentDetails.length !== input.numAgents) {
      errors.push('Agent details must be an array matching the number of agents');
    } else {
      input.agentDetails.forEach((agent, index) => {
        if (typeof agent.name !== 'string' || agent.name.trim().length === 0) {
          errors.push(`Agent ${index + 1} name must be a non-empty string`);
        } else if (agent.name.length > 50) {
          errors.push(`Agent ${index + 1} name must be 50 characters or less`);
        }
  
        if (typeof agent.personality !== 'string' || agent.personality.trim().length === 0) {
          errors.push(`Agent ${index + 1} personality must be a non-empty string`);
        } else if (agent.personality.length > 500) {
          errors.push(`Agent ${index + 1} personality must be 500 characters or less`);
        }
      });
    }
  
    return { valid: errors.length === 0, errors };
  }