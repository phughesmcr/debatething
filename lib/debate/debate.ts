import type { OpenAI } from "openai";
import type { DebateRequest } from "routes/api/debate.tsx";
import { Moderator } from "./moderator.ts";
import { createSystemMessage, makeAPIRequest } from "./submit.ts";

// deno-fmt-ignore
type ChatCompletionMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export function conductDebateStream(request: DebateRequest) {
  const {
    position,
    context,
    numAgents,
    agentDetails,
    uuid,
    numDebateRounds,
  } = request;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const moderator = new Moderator(controller);
        const systemMessage = createSystemMessage(
          position,
          context,
          agentDetails,
        );
        const debateHistory: ChatCompletionMessageParam[] = [{
          role: "system",
          content: systemMessage,
        }];

        // Moderator introduces the debate
        moderator.welcome(position);

        // Moderator introduces each agent
        for (const agent of agentDetails) {
          moderator.introduceAgent(agent.name, agent.personality, agent.stance);
        }

        // Opening statements
        moderator.announceOpeningStatements();
        for (let agentNum = 0; agentNum < numAgents; agentNum++) {
          const currentAgent = agentDetails[agentNum];
          moderator.requestOpeningStatement(currentAgent.name);

          // deno-fmt-ignore
          const userPrompt = `You are ${currentAgent.name}. Your stance is ${currentAgent.stance} the position. Provide your opening statement on the topic. Remember to stay in character as described in your personality and maintain your assigned stance.`;
          debateHistory.push({ role: "user", content: userPrompt });

          const messages: ChatCompletionMessageParam[] = [...debateHistory];

          const fullContent = await makeAPIRequest(
            messages,
            controller,
            encoder,
            currentAgent.name,
            uuid,
          );

          debateHistory.push({ role: "assistant", content: fullContent });

          moderator.thankAgent(currentAgent.name);
        }

        // Debate rounds
        for (let round = 0; round < numDebateRounds; round++) {
          moderator.announceDebateRound(round + 1);

          for (let agentNum = 0; agentNum < numAgents; agentNum++) {
            const currentAgent = agentDetails[agentNum];
            moderator.requestResponse(currentAgent.name);

            // deno-fmt-ignore
            const userPrompt = `You are ${currentAgent.name}. Your stance is ${currentAgent.stance} the position. Respond to the previous arguments, addressing points made by other participants. Remember to stay in character, maintain your perspective, and argue from your assigned stance.`;
            debateHistory.push({ role: "user", content: userPrompt });

            const messages: ChatCompletionMessageParam[] = [...debateHistory];

            const fullContent = await makeAPIRequest(
              messages,
              controller,
              encoder,
              currentAgent.name,
              uuid,
            );

            debateHistory.push({ role: "assistant", content: fullContent });

            moderator.thankAgent(currentAgent.name);
          }
        }

        // Concluding statements
        moderator.announceConcludingStatements();

        for (let agentNum = 0; agentNum < numAgents; agentNum++) {
          const currentAgent = agentDetails[agentNum];
          moderator.requestConcludingStatement(currentAgent.name);

          // deno-fmt-ignore
          const userPrompt = `You are ${currentAgent.name}. Your stance is ${currentAgent.stance} the position. Taking into account the whole debate, provide your concluding statement on the topic, summarizing your main points and final position. Remember to stay in character as described in your personality and maintain your assigned stance.`;
          debateHistory.push({ role: "user", content: userPrompt });

          const messages: ChatCompletionMessageParam[] = [...debateHistory];

          const fullContent = await makeAPIRequest(
            messages,
            controller,
            encoder,
            currentAgent.name,
            uuid,
          );

          debateHistory.push({ role: "assistant", content: fullContent });

          moderator.thankAgent(currentAgent.name);

          // Moderator closes the debate
          moderator.closeDebate();
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        console.error("Error in conductDebateStream:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${
              JSON.stringify({
                role: "system",
                content: `Error: ${error.message}`,
              })
            }\n\n`,
          ),
        );
        controller.error(error);
      } finally {
        controller.close();
      }
    },
  });

  return stream;
}
