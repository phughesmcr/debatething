import { agent } from "./agent.ts";
import type { OpenAI } from "openai";
type ChatCompletionMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;

const MODEL = "gpt-4o-mini";
const MAX_TOKENS = 1024;
const TEMPERATURE = 0.2;
const DEBATE_ROUNDS = 1;
const CONCLUDING_STATEMENTS = true;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
export const MODERATOR_NAME = "Moderator";

interface AgentDetails {
  name: string;
  personality: string;
  stance: "for" | "against" | "undecided" | "moderator";
  voice: string;
  uuid: string;
}

const createSystemMessage = (position: string, context: string | undefined, agentDetails: AgentDetails[]) => {
  const agentDescriptions = agentDetails.map((agent, index) => 
    `Agent ${index + 1} (${agent.name}): ${agent.personality}. Stance: ${agent.stance} the position.`
  ).join("\n");
  
  let message = `You are participating in a debate about the following position: "${position}". `;
  
  if (context && context.trim()) {
    message += `\nContext for the debate: ${context}\n\n`;
  }
  
  message += `There are ${agentDetails.length} participants in this debate, each with a unique perspective:

${agentDescriptions}

The debate will consist of opening statements followed by interactive debate rounds, and then concluding statements.
Make your interactive debate rounds concise and to the point, ensuring that each agent gets a chance to speak. The conversation should be engaging and interactive, with each agent responding to the previous arguments. Make it conversational, like all the agents are sat around a table debating.
Maintain your assigned personality throughout the debate. Avoid starting your responses with phrases like "As [name]," or "Speaking as [name],".`;

  return message;
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

async function makeAPIRequest(messages: ChatCompletionMessageParam[], controller: ReadableStreamDefaultController<Uint8Array>, encoder: TextEncoder, agentName: string, uuid: string) {
  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const response = await agent?.chat.completions.create({
        model: MODEL,
        messages,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        stream: true,
        user: uuid,
      });

      if (!response) throw new Error("No response from OpenAI");

      let fullContent = "";
      for await (const part of response) {
        const content = trimAgentPrefix(part.choices[0]?.delta?.content || '', agentName);
        const finishReason = part.choices[0]?.finish_reason;

        if (content) {
          fullContent += content;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ role: agentName, content })}\n\n`));
        }

        if (finishReason) {
          if (finishReason !== "stop") {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ role: "system", content: `[Warning: Response finished due to ${finishReason}]` })}\n\n`));
          }
          break;
        }
      }

      return fullContent;
    } catch (error) {
      if (error instanceof Error && error.message.includes("Rate limit exceeded")) {
        if (retries < MAX_RETRIES - 1) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retries));
          continue;
        }
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

export async function conductDebateStream(position: string, context: string | undefined, numAgents: number, agentDetails: AgentDetails[], uuid: string) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const systemMessage = createSystemMessage(position, context, agentDetails);
        const debateHistory: ChatCompletionMessageParam[] = [{ role: "system", content: systemMessage }];
        
        // Helper function to send moderator messages
        const sendModeratorMessage = (content: string) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ role: MODERATOR_NAME, content })}\n\n`));
        };

        // Moderator introduces the debate
        sendModeratorMessage(`Welcome to our debate on the topic: "${position}". I'll be your moderator for this discussion. Let's begin by introducing our participants:`);

        // Moderator introduces each agent
        for (const agent of agentDetails) {
          sendModeratorMessage(`${agent.name}: ${agent.personality}. Their stance is ${agent.stance} the position.`);
        }

        // Opening statements
        sendModeratorMessage("Now, let's hear opening statements from each participant.");
        for (let agentNum = 0; agentNum < numAgents; agentNum++) {
          const currentAgent = agentDetails[agentNum];
          sendModeratorMessage(`${currentAgent.name}, please provide your opening statement.`);

          const userPrompt = `You are ${currentAgent.name}. Your stance is ${currentAgent.stance} the position. Provide your opening statement on the topic. Remember to stay in character as described in your personality and maintain your assigned stance.`;
          debateHistory.push({ role: "user", content: userPrompt });

          const messages: ChatCompletionMessageParam[] = [...debateHistory];

          const fullContent = await makeAPIRequest(messages, controller, encoder, currentAgent.name, uuid);

          debateHistory.push({ role: "assistant", content: fullContent });
          
          sendModeratorMessage(`Thank you, ${currentAgent.name}.`);
        }

        // Debate rounds
        for (let round = 0; round < DEBATE_ROUNDS; round++) {
          sendModeratorMessage(`We're now moving to debate round ${round + 1}.`);

          for (let agentNum = 0; agentNum < numAgents; agentNum++) {
            const currentAgent = agentDetails[agentNum];
            sendModeratorMessage(`${currentAgent.name}, it's your turn to respond.`);

            const userPrompt = `You are ${currentAgent.name}. Your stance is ${currentAgent.stance} the position. Respond to the previous arguments, addressing points made by other participants. Remember to stay in character, maintain your perspective, and argue from your assigned stance.`;
            debateHistory.push({ role: "user", content: userPrompt });

            const messages: ChatCompletionMessageParam[] = [...debateHistory];

            const fullContent = await makeAPIRequest(messages, controller, encoder, currentAgent.name, uuid);

            debateHistory.push({ role: "assistant", content: fullContent });

            sendModeratorMessage(`Thank you, ${currentAgent.name}.`);
          }
        }

        // Concluding statements
        if (CONCLUDING_STATEMENTS) {
          sendModeratorMessage(`We've now reached the concluding statements portion of our debate.`);

          for (let agentNum = 0; agentNum < numAgents; agentNum++) {
            const currentAgent = agentDetails[agentNum];
            sendModeratorMessage(`${currentAgent.name}, please provide your concluding statement.`);

            const userPrompt = `You are ${currentAgent.name}. Your stance is ${currentAgent.stance} the position. Taking into account the whole debate, provide your concluding statement on the topic, summarizing your main points and final position. Remember to stay in character as described in your personality and maintain your assigned stance.`;
            debateHistory.push({ role: "user", content: userPrompt });

            const messages: ChatCompletionMessageParam[] = [...debateHistory];

            const fullContent = await makeAPIRequest(messages, controller, encoder, currentAgent.name, uuid);

            debateHistory.push({ role: "assistant", content: fullContent });

            sendModeratorMessage(`Thank you, ${currentAgent.name}, for your concluding statement.`);
          }

          // Moderator closes the debate
          sendModeratorMessage("This concludes our debate. Thank you to all our participants for their insightful contributions.");
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        console.error("Error in conductDebateStream:", error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ role: "system", content: `Error: ${error.message}` })}\n\n`));
        controller.error(error);
      } finally {
        controller.close();
      }
    }
  });

  return stream;
}