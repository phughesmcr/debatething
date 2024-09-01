import { useState } from "preact/hooks";
import { personalities, Personality } from "lib/debate/personalities.ts";
import { sanitizeInput } from "lib/utils.ts";
import { MAX_NAME_LENGTH, MAX_PERSONALITY_LENGTH } from "lib/debate/inputValidation.ts";
import { DEFAULT_VOICE } from "routes/api/voicesynth.tsx";

interface AgentSelectorProps {
  agentDetails: Required<Personality>[];
  setAgentDetails: (agents: Required<Personality>[]) => void;
}

export default function AgentSelector(
  { agentDetails, setAgentDetails }: AgentSelectorProps,
) {
  const [showCustomAgents, setShowCustomAgents] = useState(false);

  const handlePersonalitySelect = (personality: Personality, index: number) => {
    const newAgents = [...agentDetails];
    newAgents[index] = {
      ...personality,
      stance: newAgents[index].stance,
      voice: personality.voice || newAgents[index].voice || DEFAULT_VOICE,
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

  const toggleCustomAgents = () => {
    setShowCustomAgents(!showCustomAgents);
  };

  return (
    <div class="space-y-6">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {agentDetails.length > 0
          ? (
            agentDetails.map((agent, index) => (
              <div key={index} class="bg-white shadow-md rounded-lg p-6">
                <h4 class="text-lg font-semibold mb-4">Participant {index + 1}</h4>
                {showCustomAgents
                  ? (
                    <>
                      <div class="mb-4">
                        <label htmlFor={`agent-name-${index}`} class="block text-sm font-medium text-gray-700 mb-2">
                          Name:
                        </label>
                        <input
                          id={`agent-name-${index}`}
                          type="text"
                          value={agent.name}
                          onInput={(e) =>
                            handleAgentDetailChange(
                              index,
                              "name",
                              sanitizeInput((e.target as HTMLInputElement).value),
                            )}
                          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          maxLength={MAX_NAME_LENGTH}
                          required
                        />
                      </div>
                      <div class="mb-4">
                        <label
                          htmlFor={`agent-personality-${index}`}
                          class="block text-sm font-medium text-gray-700 mb-2"
                        >
                          Personality:
                        </label>
                        <textarea
                          id={`agent-personality-${index}`}
                          value={agent.personality}
                          onInput={(e) =>
                            handleAgentDetailChange(
                              index,
                              "personality",
                              (e.target as HTMLTextAreaElement).value,
                            )}
                          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          maxLength={MAX_PERSONALITY_LENGTH}
                          required
                        />
                      </div>
                    </>
                  )
                  : (
                    <div class="mb-4">
                      <label
                        htmlFor={`agent-personality-${index}`}
                        class="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Personality:
                      </label>
                      <select
                        id={`agent-personality-${index}`}
                        value={agent.name}
                        onChange={(e) => {
                          const selected = personalities.find((p) => p.name === (e.target as HTMLSelectElement).value);
                          if (selected) handlePersonalitySelect(selected, index);
                        }}
                        class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        {personalities.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                      </select>
                    </div>
                  )}
                <div class="mb-4">
                  <label htmlFor={`agent-stance-${index}`} class="block text-sm font-medium text-gray-700 mb-2">
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
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="for">For</option>
                    <option value="against">Against</option>
                    <option value="undecided">Undecided</option>
                  </select>
                </div>
                <div class="mb-4">
                  <label htmlFor={`agent-voice-${index}`} class="block text-sm font-medium text-gray-700 mb-2">
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
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          : <p class="text-gray-600">No agents available. Please add agents to continue.</p>}
      </div>
      <button
        type="button"
        onClick={toggleCustomAgents}
        class="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition duration-150 ease-in-out"
      >
        {showCustomAgents ? "Use Predefined Personalities" : "Customize Agents"}
      </button>
    </div>
  );
}
