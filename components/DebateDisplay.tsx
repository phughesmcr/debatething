import type { Personality } from "lib/debate/personalities.ts";

interface DebateDisplayProps {
  debate: Array<{ role: string; content: string }>;
  agentDetails: Required<Personality>[];
  isDebateFinished: boolean;
}

const STANCE_COLORS: Record<string, string> = {
  for: "text-green-700 dark:text-green-300",
  against: "text-red-700 dark:text-red-300",
  undecided: "text-yellow-700 dark:text-yellow-300",
  other: "text-blue-700 dark:text-blue-300",
};

const getAgentColor = (stance: string): string => {
  return STANCE_COLORS[stance] || STANCE_COLORS.other;
};

export default function DebateDisplay(props: DebateDisplayProps) {
  const { debate, agentDetails, isDebateFinished } = props;

  return (
    <div class="mt-8" aria-label="Debate results">
      <h2 class="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Debate Results</h2>
      <div class="space-y-6">
        {debate.map((message, index) => {
          const isModerator = message.role === "system" || message.role === "moderator";
          const agent = isModerator ? null : agentDetails.find((a) => a.name === message.role);

          return (
            <article
              key={index}
              class={`bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-3 ${
                isModerator ? "border-l-4 border-blue-500" : ""
              }`}
            >
              <header class="flex items-center justify-between mb-2">
                <h3
                  class={`text-lg font-semibold ${
                    isModerator ? "text-blue-700 dark:text-blue-300" : getAgentColor(agent?.stance || "other")
                  }`}
                >
                  {isModerator ? "Moderator" : agent?.name || message.role}
                  {!isModerator && agent?.stance && ` (${agent.stance})`}
                </h3>
              </header>
              <p class="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{message.content}</p>
            </article>
          );
        })}
      </div>
      {isDebateFinished && <p class="mt-6 text-green-600 dark:text-green-400 font-semibold">Debate has concluded.</p>}
    </div>
  );
}
