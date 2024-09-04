import { agent } from "lib/agent.ts";
import type { OpenAI } from "openai";
import type { AgentDetails } from "routes/api/debate.tsx";
import { trimAgentPrefix } from "./outputConformer.ts";
import { cleanContent } from "lib/utils.ts";

// deno-fmt-ignore
type ChatCompletionMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;

const MODEL = "gpt-4o-mini";
const MAX_TOKENS = 1024;
const TEMPERATURE = 0.2;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export const createAgentDescriptions = (
  agentDetails: AgentDetails[],
): string => {
  return agentDetails.map((agent, index) => {
    // deno-fmt-ignore
    return `Participant ${index + 1} (${agent.name}): ${agent.personality}. Stance: "${agent.stance}" the position.`;
  }).join("\n");
};

export const createSystemMessage = (
  position: string,
  context: string | undefined,
  agentDetails: AgentDetails[],
): string => {
  // deno-fmt-ignore
  let message = `You are participating in a debate about the following position: "${position}". `;

  if (context && context.trim()) {
    message += `\nContext for the debate: ${context}\n\n`;
  }

  // deno-fmt-ignore
  message += `There are ${agentDetails.length} participants in this debate, each with a unique perspective:`;
  message += createAgentDescriptions(agentDetails);

  // deno-fmt-ignore
  message += "You will act as each of these participants in turn.";
  // deno-fmt-ignore
  message += "The debate will consist of opening statements followed by interactive debate rounds, and then concluding statements.";
  // deno-fmt-ignore
  message += "Your opening statement should contain your most important points.";
  // deno-fmt-ignore
  message += "Interactive debate rounds should be concise and to the point, addressing the points made by other participants, as well as establishing your position and its evidence.";
  // deno-fmt-ignore
  message += "Your closing statement should summarise your position and its evidence, while defeating the points made by other participants.";
  // deno-fmt-ignore
  message += "Be conversational, engaging and interactive, like you are sat around a table.";
  // deno-fmt-ignore
  message += "Try to show the very best of conventional and folk wisdom in your answers.";
  // deno-fmt-ignore
  message += "Maintain your assigned personality throughout the debate. Avoid starting your responses with phrases like 'As [name],' or 'Speaking as [name],'";

  return cleanContent(message);
};

export async function makeAPIRequest(
  messages: ChatCompletionMessageParam[],
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  agentName: string,
  uuid: string,
  signal: AbortSignal
) {
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
        if (signal.aborted) {
          throw new Error("Debate cancelled");
        }
        const content = trimAgentPrefix(
          part.choices[0]?.delta?.content || "",
          agentName,
        );
        const finishReason = part.choices[0]?.finish_reason;

        if (content && !controller.desiredSize) {
          fullContent += content;
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ role: agentName, content })}\n\n`,
            ),
          );
        }

        if (finishReason) {
          if (finishReason !== "stop" && !controller.desiredSize) {
            controller.enqueue(
              encoder.encode(
                `data: ${
                  JSON.stringify({
                    role: "system",
                    content: `[Warning: Response finished due to ${finishReason}]`,
                  })
                }\n\n`,
              ),
            );
          }
          break;
        }
      }

      return fullContent;
    } catch (error) {
      if (error.message === "Debate cancelled") {
        throw error;
      }
      if (
        error instanceof Error && error.message.includes("Rate limit exceeded")
      ) {
        if (retries < MAX_RETRIES - 1) {
          retries++;
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * retries));
          continue;
        }
      }
      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}
