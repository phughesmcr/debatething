export const trimAgentPrefix = (content: string, agentName: string): string => {
  const prefixes = [
    `As ${agentName},`,
    `Speaking as ${agentName},`,
    `${agentName} here,`,
    `This is ${agentName},`,
    `${agentName}:`,
    `${agentName},`,
  ];

  for (const prefix of prefixes) {
    if (content.startsWith(prefix)) {
      return content.slice(prefix.length).trim();
    }
  }

  if (content.startsWith(`\s${agentName}\W`)) {
    return content.slice(agentName.length + 1).trim();
  }

  return content;
};
