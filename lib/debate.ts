import { agent } from "./agent.ts";
import type { OpenAI } from "openai";
type ChatCompletionMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;

const MODEL = "gpt-4o-mini";
const MAX_TOKENS = 1024;
const TEMPERATURE = 0.2;
const DEBATE_ROUNDS = 2;

interface AgentDetails {
  name: string;
  personality: string;
}

const createSystemMessage = (position: string, agentDetails: AgentDetails[]) => {
  const agentDescriptions = agentDetails.map((agent, index) => 
    `Agent ${index + 1} (${agent.name}): ${agent.personality}`
  ).join("\n");
  
  return `You are participating in a debate about the following position: "${position}". 
There are ${agentDetails.length} participants in this debate, each with a unique perspective:

${agentDescriptions}

The debate will consist of opening statements followed by interactive debate rounds.
Maintain your assigned personality throughout the debate. Avoid starting your responses with phrases like "As [name]," or "Speaking as [name],".`;
};

const trimAgentPrefix = (content: string, agentName: string): string => {
  const prefixes = [
    `As ${agentName},`,
    `Speaking as ${agentName},`,
    `${agentName} here,`,
    `This is ${agentName},`,
    `${agentName}:`,
    `${agentName},`
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

export async function conductDebateStream(position: string, numAgents: number, agentDetails: AgentDetails[]) {
	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		async start(controller) {
			try {
				const systemMessage = createSystemMessage(position, agentDetails);
				const debateHistory: ChatCompletionMessageParam[] = [{ role: "system", content: systemMessage }];
				
				// Opening statements
				for (let agentNum = 0; agentNum < numAgents; agentNum++) {
					const currentAgent = agentDetails[agentNum];
					const userPrompt = `You are ${currentAgent.name}. Provide your opening statement on the topic. Remember to stay in character as described in your personality.`;
					debateHistory.push({ role: "user", content: userPrompt });

					const messages: ChatCompletionMessageParam[] = [...debateHistory];

					const response = await agent?.chat.completions.create({
						model: MODEL,
						messages,
						max_tokens: MAX_TOKENS,
						temperature: TEMPERATURE,
						stream: true,
					});

					if (!response) throw new Error("No response from OpenAI");

					let fullContent = "";
					for await (const part of response) {
						const content = part.choices[0]?.delta?.content || '';
						if (content) {
							fullContent += content;
							controller.enqueue(encoder.encode(`data: ${JSON.stringify({ role: currentAgent.name, content })}\n\n`));
						}
					}

					debateHistory.push({ role: "assistant", content: fullContent });
					
					const endStatement = `End of ${currentAgent.name}'s opening statement.`;
					debateHistory.push({ role: "user", content: endStatement });
					controller.enqueue(encoder.encode(`data: ${JSON.stringify({ role: "user", content: endStatement })}\n\n`));
				}

				// Debate rounds
				for (let round = 0; round < DEBATE_ROUNDS; round++) {
					const roundStart = `Starting debate round ${round + 1}.`;
					debateHistory.push({ role: "user", content: roundStart });
					controller.enqueue(encoder.encode(`data: ${JSON.stringify({ role: "user", content: roundStart })}\n\n`));

					for (let agentNum = 0; agentNum < numAgents; agentNum++) {
						const currentAgent = agentDetails[agentNum];
						const userPrompt = `You are ${currentAgent.name}. Respond to the previous arguments, addressing points made by other participants. Remember to stay in character and maintain your perspective.`;
						debateHistory.push({ role: "user", content: userPrompt });

						const messages: ChatCompletionMessageParam[] = [...debateHistory];

						const response = await agent?.chat.completions.create({
							model: MODEL,
							messages,
							max_tokens: MAX_TOKENS,
							temperature: TEMPERATURE,
							stream: true,
						});

						if (!response) throw new Error("No response from OpenAI");

						let fullContent = "";
						for await (const part of response) {
							const content = part.choices[0]?.delta?.content || '';
							if (content) {
								fullContent += content;
								controller.enqueue(encoder.encode(`data: ${JSON.stringify({ role: currentAgent.name, content })}\n\n`));
							}
						}

						debateHistory.push({ role: "assistant", content: fullContent });

						const endTurn = `End of ${currentAgent.name}'s turn in round ${round + 1}.`;
						debateHistory.push({ role: "user", content: endTurn });
						controller.enqueue(encoder.encode(`data: ${JSON.stringify({ role: "user", content: endTurn })}\n\n`));
					}
				}
				controller.enqueue(encoder.encode("data: [DONE]\n\n"));
			} catch (error) {
				console.error("Error in conductDebateStream:", error);
				controller.error(error);
			} finally {
				controller.close();
			}
		}
	});

	return stream;
}