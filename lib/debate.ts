import { agent } from "./agent.ts";
import type { OpenAI } from "openai";
type ChatCompletionMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;

const MODEL = "gpt-4o-mini";
const MAX_TOKENS = 1024;
const TEMPERATURE = 0.2;
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
    `Participant ${index + 1} (${agent.name}): ${agent.personality}. Stance: "${agent.stance}" the position.`
  ).join("\n");
  
  let message = `You are participating in a debate about the following position: "${position}". `;
  
  if (context && context.trim()) {
    message += `\nContext for the debate: ${context}\n\n`;
  }
  
  message += `There are ${agentDetails.length} participants in this debate, each with a unique perspective:

${agentDescriptions}

You will act as each of these participants in turn.
The debate will consist of opening statements followed by interactive debate rounds, and then concluding statements.
Your opening statement should contain your most important points.
Interactive debate rounds should be concise and to the point, addressing the points made by other participants, as well as establishing your position and its evidence. 
Your closing statement should summarise your position and its evidence, while defeating the points made by other participants.
Be conversational, engaging and interactive, like you are sat around a table.
Try to show the very best of conventional and folk wisdom in your answers.
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

const moderatorResponses = {
  welcome: [
    `Welcome to our debate on the topic: "{position}". I'll be your moderator for this discussion. Let's begin by introducing our participants:\n`,
    `Ladies and gentlemen, welcome to this debate. Our topic is: "{position}". As your moderator, I'm excited to introduce our participants:\n`,
    `Good day, everyone. We're here to debate an intriguing topic: "{position}". Allow me to introduce the participants in this intellectual discourse:\n`,
    `Thank you for joining us for this thought-provoking debate on: "{position}". I'll be guiding the discussion as your moderator. Let's meet our esteemed participants:\n`,
    `Welcome, distinguished guests and participants. Today's debate centers around: "{position}". As your moderator, I'm pleased to introduce our debaters:\n`,
    `Greetings, and welcome to this forum of ideas. Our topic of discussion is: "{position}". I'll be your moderator, and I'm delighted to present our participants:\n`,
    `Welcome to this intellectual arena where we'll be exploring the topic: "{position}". As your moderator, I'm honored to introduce our distinguished debaters:\n`,
    `Good evening and welcome. We're gathered here to debate the proposition: "{position}". I'll be moderating, and it's my pleasure to introduce our speakers:\n`,
    `Thank you all for being here. Our debate today focuses on: "{position}". As your moderator, I'm eager to introduce the minds who will be shaping our discussion:\n`,
    `Welcome to this exchange of ideas. Our topic: "{position}" promises a lively debate. As moderator, I'm thrilled to present our participants:\n`,
  ],
  introduction: [
    `Welcome, {name}. They are described as "{personality}". Their stance is "{stance}" the position.\n`,
    `Let's welcome {name} to the debate. We're told they are "{personality}". Their stance is "{stance}" the position.\n`,
    `With us is {name}. Described as "{personality}". Their stance is "{stance}" the position.\n`,
    `Please give a warm welcome to {name}. Known for being "{personality}", they stand "{stance}" the position.\n`,
    `Joining our discussion is {name}. They bring a "{personality}" perspective and are "{stance}" the position.\n`,
    `Next, we have {name}. Characterized as "{personality}", they approach this topic from a stance that is "{stance}" the position.\n`,
    `Allow me to introduce {name}. Their "{personality}" nature informs their view, which is "{stance}" the position.\n`,
    `Our next participant is {name}. With a reputation for being "{personality}", they come to us "{stance}" the position.\n`,
    `{name} joins us next. Their "{personality}" approach contributes to their stance, which is "{stance}" the position.\n`,
    `Let's hear from {name}. Noted for their "{personality}", they enter this debate "{stance}" the position.\n`,
  ],
  openingStatement: [
    `{name}, you have the floor for your opening statement.\n`,
    `Let's hear from {name} for their opening remarks.\n`,
    `{name}, please present your opening argument.\n`,
    `The floor is yours, {name}. Please share your initial thoughts on the topic.\n`,
    `{name}, we're eager to hear your opening perspective on this issue.\n`,
    `{name}, would you kindly start us off with your opening statement?\n`,
    `Now, let's turn to {name} for their opening argument.\n`,
    `{name}, please kick off the debate with your opening remarks.\n`,
    `We begin with {name}. Please provide us with your opening statement.\n`,
    `{name}, we invite you to open the debate with your initial argument.\n`,
  ],
  thankYou: [
    `Thank you, {name}.\n`,
    `We appreciate your input, {name}.\n`,
    `That was insightful, {name}.\n`,
    `An interesting perspective, {name}. Thank you.\n`,
    `Your points are well-taken, {name}. Thank you for sharing.\n`,
    `Thank you for those thoughts, {name}.\n`,
    `We value your contribution, {name}. Thank you.\n`,
    `{name}, thank you for those compelling arguments.\n`,
    `Your perspective adds much to our debate, {name}. Thank you.\n`,
    `Thank you for that thoughtful presentation, {name}.\n`,
  ],
  debateRound: [
    `We're now moving to debate round {round}.\n`,
    `Let's begin round {round} of our debate.\n`,
    `It's time for the round {round} of discussion.\n`,
    `We're progressing to round {round} of our intellectual exchange.\n`,
    `As we delve deeper, let's commence round {round} of our debate.\n`,
    `We now enter round {round} of our discussion.\n`,
    `Round {round} of our debate is about to begin.\n`,
    `Let's proceed to the {round} round of arguments.\n`,
    `We're advancing to round {round} of this stimulating debate.\n`,
    `Prepare for round {round} as we continue our intellectual discourse.\n`,
  ],
  response: [
    `{name}, it's your turn to respond.\n`,
    `{name}, what's your take so far?\n`,
    `Let's hear from {name} on these arguments.\n`,
    `{name}, how would you address the points raised?\n`,
    `We turn now to {name} for their perspective on the discussion.\n`,
    `{name}, we'd like your response to what's been said.\n`,
    `Your thoughts on this, {name}?\n`,
    `{name}, how do you react to the arguments presented?\n`,
    `We're interested in your response, {name}.\n`,
    `{name}, please share your counterarguments or supporting points.\n`,
  ],
  concludingStatement: [
    `{name}, please provide your concluding statement.\n`,
    `As we wrap up, {name}, share your final thoughts.\n`,
    `{name}, sum up your position for us.\n`,
    `To conclude your argument, {name}, please offer your closing remarks.\n`,
    `{name}, we invite you to synthesize your stance in a final statement.\n`,
    `It's time for your closing argument, {name}.\n`,
    `{name}, please present your concluding thoughts on the matter.\n`,
    `As we reach the end, {name}, offer us your final perspective.\n`,
    `{name}, bring your argument to a close with your concluding statement.\n`,
    `To wrap up your position, {name}, please provide your final remarks.\n`,
  ],
  closing: [
    `This concludes our debate. Thank you to all our participants for their insightful contributions.\n`,
    `And with that, we bring this stimulating debate to a close. My thanks to all the participants for their thoughtful arguments.\n`,
    `As we end this debate, I'd like to express my gratitude to our participants for their engaging and thought-provoking discussion.\n`,
    `We've reached the end of our debate. I want to commend all participants for their eloquence and the depth of their arguments.\n`,
    `This marks the conclusion of our debate. The diverse perspectives shared today have undoubtedly enriched our understanding of the topic. Thank you all for your participation.\n`,
    `Our debate comes to an end. I extend my sincere appreciation to all participants for their valuable insights and respectful discourse.\n`,
    `As we close this debate, I want to thank our participants for their well-reasoned arguments and the audience for their attention.\n`,
    `This debate has come full circle. My gratitude goes out to all involved for contributing to this enlightening discussion.\n`,
    `We've reached the culmination of our debate. Thank you to our participants for their compelling arguments and to our audience for their engagement.\n`,
    `As moderator, I declare this debate concluded. The level of discourse and intellectual rigor displayed today has been truly commendable. Thank you all.\n`,
  ],
};
function createRandomResponseGenerator() {
  const usedResponses = new Set<string>();

  return function getRandomResponse(category: keyof typeof moderatorResponses, replacements: Record<string, string> = {}): string {
    const responses = moderatorResponses[category];
    let unusedResponses = responses.filter(r => !usedResponses.has(r));
    
    if (unusedResponses.length === 0) {
      usedResponses.clear();
      unusedResponses = responses;
    }

    const randomIndex = Math.floor(Math.random() * unusedResponses.length);
    const selectedResponse = unusedResponses[randomIndex];
    usedResponses.add(selectedResponse);

    return Object.entries(replacements).reduce(
      (str, [key, value]) => str.replace(`{${key}}`, value),
      selectedResponse
    );
  };
}

export function conductDebateStream(position: string, context: string | undefined, numAgents: number, agentDetails: AgentDetails[], uuid: string, numDebateRounds: number) {
  const encoder = new TextEncoder();
  const getRandomResponse = createRandomResponseGenerator();

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
        sendModeratorMessage(getRandomResponse('welcome', { position }));

        // Moderator introduces each agent
        for (const agent of agentDetails) {
          sendModeratorMessage(getRandomResponse('introduction', { 
            name: agent.name, 
            personality: agent.personality, 
            stance: agent.stance 
          }));
        }

        // Opening statements
        sendModeratorMessage("Now, let's hear opening statements from each participant. ");
        for (let agentNum = 0; agentNum < numAgents; agentNum++) {
          const currentAgent = agentDetails[agentNum];
          sendModeratorMessage(getRandomResponse('openingStatement', { name: currentAgent.name }));

          const userPrompt = `You are ${currentAgent.name}. Your stance is ${currentAgent.stance} the position. Provide your opening statement on the topic. Remember to stay in character as described in your personality and maintain your assigned stance.`;
          debateHistory.push({ role: "user", content: userPrompt });

          const messages: ChatCompletionMessageParam[] = [...debateHistory];

          const fullContent = await makeAPIRequest(messages, controller, encoder, currentAgent.name, uuid);

          debateHistory.push({ role: "assistant", content: fullContent });
          
          sendModeratorMessage(getRandomResponse('thankYou', { name: currentAgent.name }));
        }

        // Debate rounds
        for (let round = 0; round < numDebateRounds; round++) {
          sendModeratorMessage(getRandomResponse('debateRound', { round: (round + 1).toString() }));

          for (let agentNum = 0; agentNum < numAgents; agentNum++) {
            const currentAgent = agentDetails[agentNum];
            sendModeratorMessage(getRandomResponse('response', { name: currentAgent.name }));

            const userPrompt = `You are ${currentAgent.name}. Your stance is ${currentAgent.stance} the position. Respond to the previous arguments, addressing points made by other participants. Remember to stay in character, maintain your perspective, and argue from your assigned stance.`;
            debateHistory.push({ role: "user", content: userPrompt });

            const messages: ChatCompletionMessageParam[] = [...debateHistory];

            const fullContent = await makeAPIRequest(messages, controller, encoder, currentAgent.name, uuid);

            debateHistory.push({ role: "assistant", content: fullContent });

            sendModeratorMessage(getRandomResponse('thankYou', { name: currentAgent.name }));
          }
        }

        // Concluding statements
        if (CONCLUDING_STATEMENTS) {
          sendModeratorMessage(`We've now reached the concluding statements portion of our debate. `);

          for (let agentNum = 0; agentNum < numAgents; agentNum++) {
            const currentAgent = agentDetails[agentNum];
            sendModeratorMessage(getRandomResponse('concludingStatement', { name: currentAgent.name }));

            const userPrompt = `You are ${currentAgent.name}. Your stance is ${currentAgent.stance} the position. Taking into account the whole debate, provide your concluding statement on the topic, summarizing your main points and final position. Remember to stay in character as described in your personality and maintain your assigned stance.`;
            debateHistory.push({ role: "user", content: userPrompt });

            const messages: ChatCompletionMessageParam[] = [...debateHistory];

            const fullContent = await makeAPIRequest(messages, controller, encoder, currentAgent.name, uuid);

            debateHistory.push({ role: "assistant", content: fullContent });

            sendModeratorMessage(getRandomResponse('thankYou', { name: currentAgent.name }));
          }

          // Moderator closes the debate
          sendModeratorMessage(getRandomResponse('closing'));
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