import { agent } from "./agent.ts";
import type { OpenAI } from "openai";
type ChatCompletionMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;

const MODEL = "gpt-4o-mini";
const MAX_TOKENS = 1024;
const TEMPERATURE = 0.2;
const TURNS = 3;

const createSystemMessage = (position: string, numAgents: number) => `You are participating in a debate about the following position: "${position}". There are ${numAgents} participants in this debate. Each participant should have a unique perspective on the topic.`;

export async function conductDebateStream(position: string, numAgents: number) {
	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		async start(controller) {
			try {
				const systemMessage = createSystemMessage(position, numAgents);
				
				for (let turn = 0; turn < TURNS; turn++) {
					for (let agentNum = 0; agentNum < numAgents; agentNum++) {
						const messages: ChatCompletionMessageParam[] = [
							{ role: "system", content: systemMessage },
							{ role: "user", content: `You are Agent ${agentNum + 1}. Provide your perspective on the topic, considering the previous arguments if any.` },
						];

						const response = await agent?.chat.completions.create({
							model: MODEL,
							messages,
							max_tokens: MAX_TOKENS,
							temperature: TEMPERATURE,
							stream: true,
						});

						if (!response) throw new Error("No response from OpenAI");

						for await (const part of response) {
							const content = part.choices[0]?.delta?.content || '';
							if (content) {
								controller.enqueue(encoder.encode(`data: ${JSON.stringify({ role: "assistant", content })}\n\n`));
							}
						}

						// Send a delimiter between agents
						controller.enqueue(encoder.encode(`data: ${JSON.stringify({ role: "system", content: `--- End of Agent ${agentNum + 1}'s turn ---` })}\n\n`));
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