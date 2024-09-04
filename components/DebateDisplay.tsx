import { Personality } from "lib/debate/personalities.ts";

interface DebateDisplayProps {
  debate: Array<{ role: string; content: string }>;
  agentDetails: Required<Personality>[];
  isDebateFinished: boolean;
}

const DebateDisplay = ({
  debate,
  agentDetails,
  isDebateFinished,
}: DebateDisplayProps) => {
  const getAgentColor = (stance: string): string => {
    switch (stance) {
      case "for":
        return "text-green-600 dark:text-green-400";
      case "against":
        return "text-red-600 dark:text-red-400";
      case "undecided":
        return "text-yellow-600 dark:text-yellow-400";
      default:
        return "text-blue-600 dark:text-blue-400";
    }
  };

  return (
    <div class="mt-8">
      <h2 class="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Debate Results</h2>
      <div class="space-y-6">
        {debate.map((message, index) => {
          const isModerator = message.role === "system" || message.role === "moderator";
          const agent = isModerator ? null : agentDetails.find((a) => a.name === message.role);

          return (
            <div
              key={index}
              class={`bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-3 ${isModerator ? "border-l-4 border-blue-500" : ""}`}
            >
              <div class="flex items-center justify-between mb-2">
                <h3
                  class={`text-lg font-semibold ${
                    isModerator ? "text-blue-600 dark:text-blue-400" : getAgentColor(agent?.stance || "undecided")
                  }`}
                >
                  {isModerator ? "Moderator" : agent?.name || message.role}
                  {!isModerator && agent?.stance && ` (${agent.stance})`}
                </h3>
              </div>
              <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{message.content}</p>
            </div>
          );
        })}
      </div>
      {isDebateFinished && <p class="mt-6 text-green-600 dark:text-green-400 font-semibold">Debate has concluded.</p>}
    </div>
  );
};

export default DebateDisplay;
