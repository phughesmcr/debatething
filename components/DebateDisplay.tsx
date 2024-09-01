import { useEffect, useState } from "preact/hooks";
import { Personality } from "lib/debate/personalities.ts";
import { DEFAULT_VOICE } from "routes/api/voicesynth.tsx";

interface DebateDisplayProps {
  debate: Array<{ role: string; content: string }>;
  agentDetails: Required<Personality>[];
  isDebateFinished: boolean;
  handleAudioSynthesis: (content: string, voice: string) => Promise<HTMLAudioElement>;
  currentSynthesizingId: number | null;
}

const DebateDisplay = ({
  debate,
  agentDetails,
  isDebateFinished,
  handleAudioSynthesis,
  currentSynthesizingId,
}: DebateDisplayProps) => {
  const [accumulatedDebate, setAccumulatedDebate] = useState<Array<{ role: string; content: string }>>([]);

  useEffect(() => {
    const newAccumulatedDebate = debate.reduce((acc, message) => {
      if (message.role === "user") {
        return acc;
      }
      const lastMessage = acc[acc.length - 1];
      if (lastMessage && lastMessage.role === message.role) {
        lastMessage.content += message.content;
      } else {
        acc.push({ ...message });
      }
      return acc;
    }, [] as Array<{ role: string; content: string }>);

    setAccumulatedDebate(newAccumulatedDebate);
  }, [debate]);

  const getAgentColor = (stance: string): string => {
    switch (stance) {
      case "for":
        return "text-green-600";
      case "against":
        return "text-red-600";
      case "undecided":
        return "text-yellow-600";
      default:
        return "text-blue-600";
    }
  };

  return (
    <div class="mt-8">
      <h2 class="text-2xl font-bold mb-6">Debate Results</h2>
      <div class="space-y-6">
        {accumulatedDebate.map((message, index) => {
          const isModerator = message.role === "system" || message.role === "moderator";
          const agent = isModerator ? null : agentDetails.find((a) => a.name === message.role);

          return (
            <div
              key={index}
              class={`bg-white shadow-md rounded-lg p-6 mb-3 ${isModerator ? "border-l-4 border-blue-500" : ""}`}
            >
              <div class="flex items-center justify-between mb-2">
                <h3
                  class={`text-lg font-semibold ${
                    isModerator ? "text-blue-600" : getAgentColor(agent?.stance || "undecided")
                  }`}
                >
                  {isModerator ? "Moderator" : agent?.name || message.role}
                  {!isModerator && agent?.stance && ` (${agent.stance})`}
                </h3>
                {!isModerator && message.content && (
                  <button
                    onClick={() => handleAudioSynthesis(message.content, agent?.voice || DEFAULT_VOICE)}
                    class="hidden px-3 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out"
                    disabled={currentSynthesizingId === index}
                    hidden
                  >
                    {currentSynthesizingId === index ? "Synthesizing..." : "Play Audio"}
                  </button>
                )}
              </div>
              <p class="text-gray-700 whitespace-pre-wrap">{message.content}</p>
            </div>
          );
        })}
      </div>
      {isDebateFinished && <p class="mt-6 text-green-600 font-semibold">Debate has concluded.</p>}
    </div>
  );
};

export default DebateDisplay;
