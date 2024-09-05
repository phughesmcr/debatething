import CustomPersonalityInput from "components/CustomPersonalityInput.tsx";
import { MAX_NAME_LENGTH } from "lib/debate/inputValidation.ts";
import type { Personality } from "lib/debate/personalities.ts";
import { sanitizeInput } from "lib/utils.ts";

interface AgentSelectorProps {
  agentDetails: Required<Personality>[];
  setAgentDetails: (agents: Required<Personality>[]) => void;
}

export default function AgentSelector(
  { agentDetails, setAgentDetails }: AgentSelectorProps,
) {
  const handlePersonalityChange = (personality: string, index: number) => {
    const newAgents = [...agentDetails];
    newAgents[index] = {
      ...newAgents[index],
      personality,
    };
    setAgentDetails(newAgents);
  };

  const handleAgentDetailChange = (
    index: number,
    field: keyof Personality,
    value: string,
  ) => {
    const newAgents = [...agentDetails];
    newAgents[index] = { ...newAgents[index], [field]: value };
    setAgentDetails(newAgents);
  };

  return (
    <div class="space-y-5">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {agentDetails.length > 0
          ? (
            agentDetails.map((agent, index) => (
              <div
                key={index}
                class="bg-white dark:bg-gray-800 dark:border-gray-500 dark:border-[1px] shadow-md rounded-lg px-6 py-2"
              >
                <h4 class="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Participant {index + 1}</h4>
                <div class="mb-3">
                  <label
                    htmlFor={`agent-name-${index}`}
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Name:
                  </label>
                  <input
                    id={`agent-name-${index}`}
                    type="text"
                    value={agent.name.split(" ")[1]}
                    onInput={(e) =>
                      handleAgentDetailChange(
                        index,
                        "name",
                        sanitizeInput((e.target as HTMLInputElement).value),
                      )}
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    maxLength={MAX_NAME_LENGTH}
                    required
                  />
                </div>
                <div class="mb-3">
                  <label
                    htmlFor={`agent-personality-${index}`}
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Personality:
                  </label>
                  <CustomPersonalityInput
                    value={agent.personality}
                    onChange={(value) => handlePersonalityChange(value, index)}
                  />
                </div>
                <div class="mb-3">
                  <label
                    htmlFor={`agent-stance-${index}`}
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Stance:
                  </label>
                  <select
                    id={`agent-stance-${index}`}
                    value={agent.stance}
                    onChange={(e) =>
                      handleAgentDetailChange(
                        index,
                        "stance",
                        (e.target as HTMLSelectElement).value,
                      )}
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    required
                  >
                    <option value="for">For</option>
                    <option value="against">Against</option>
                    <option value="undecided">Undecided</option>
                  </select>
                </div>
                <div class="mb-3">
                  <label
                    htmlFor={`agent-voice-${index}`}
                    class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Voice:
                  </label>
                  <select
                    id={`agent-voice-${index}`}
                    value={agent.voice}
                    onChange={(e) =>
                      handleAgentDetailChange(
                        index,
                        "voice",
                        (e.target as HTMLSelectElement).value,
                      )}
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    required
                  >
                    <option value="alloy">Alloy (Male)</option>
                    <option value="echo">Echo (Male)</option>
                    <option value="fable">Fable (Male)</option>
                    <option value="onyx">Onyx (Male)</option>
                    <option value="nova">Nova (Female)</option>
                    <option value="shimmer">Shimmer (Female)</option>
                  </select>
                </div>
              </div>
            ))
          )
          : <p class="text-gray-600 dark:text-gray-400">No agents available. Please add agents to continue.</p>}
      </div>
    </div>
  );
}
