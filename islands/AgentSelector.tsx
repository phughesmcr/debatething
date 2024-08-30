import { useState } from "preact/hooks";
import { personalities, Personality } from "../lib/personalities.ts";
import { sanitizeInput } from "lib/inputSanitizer.ts";
import { MAX_NAME_LENGTH, MAX_PERSONALITY_LENGTH } from "lib/inputValidation.ts";

interface AgentSelectorProps {
  agents: Required<Personality>[];
  onAgentChange: (agents: Required<Personality>[]) => void;
}

export default function AgentSelector({ agents, onAgentChange }: AgentSelectorProps) {
  const [showCustomAgents, setShowCustomAgents] = useState(false);
  const handlePersonalitySelect = (personality: Personality, index: number) => {
    const newAgents = [...agents];
    newAgents[index] = {
      ...personality,
      stance: newAgents[index].stance,
      voice: personality.voice  || newAgents[index].voice || "alloy"
    };
    onAgentChange(newAgents);
  };

  const handleAgentDetailChange = (index: number, field: keyof Personality, value: string) => {
    const newAgents = [...agents];
    newAgents[index] = { ...newAgents[index], [field]: value };
    onAgentChange(newAgents);
  };

  const toggleCustomAgents = () => {
    setShowCustomAgents(!showCustomAgents);
  };

  return (
    <div>
      <h3 class="text-lg font-semibold mb-2">Agent Details</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {agents.map((agent, index) => (
          <div key={index} class="border rounded p-4">
            <h4 class="text-md font-semibold mb-2">Agent {index + 1}</h4>
            {showCustomAgents ? (
              <>
                <div class="mb-2">
                  <label htmlFor={`agent-name-${index}`} class="block mb-1">Name:</label>
                  <input
                    id={`agent-name-${index}`}
                    type="text"
                    value={agent.name}
                    onInput={(e) => handleAgentDetailChange(index, "name", sanitizeInput((e.target as HTMLInputElement).value))}
                    class="w-full p-2 border rounded"
                    maxLength={MAX_NAME_LENGTH}
                    required
                  />
                </div>
                <div class="mb-2">
                  <label htmlFor={`agent-personality-${index}`} class="block mb-1">Personality:</label>
                  <textarea
                    id={`agent-personality-${index}`}
                    value={agent.personality}
                    onInput={(e) => handleAgentDetailChange(index, "personality", (e.target as HTMLTextAreaElement).value)}
                    class="w-full p-2 border rounded"
                    maxLength={MAX_PERSONALITY_LENGTH}
                    required
                  />
                </div>
              </>
            ) : (
              <div class="mb-2">
                <label htmlFor={`agent-personality-${index}`} class="block mb-1">Personality:</label>
                <select
                  id={`agent-personality-${index}`}
                  value={agent.name}
                  onChange={(e) => {
                    const selected = personalities.find(p => p.name === (e.target as HTMLSelectElement).value);
                    if (selected) handlePersonalitySelect(selected, index);
                  }}
                  class="w-full p-2 border rounded"
                  required
                >
                  {personalities.map((p) => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div class="mb-2">
              <label htmlFor={`agent-stance-${index}`} class="block mb-1">Stance:</label>
              <select
                id={`agent-stance-${index}`}
                value={agent.stance}
                onChange={(e) => handleAgentDetailChange(index, "stance", (e.target as HTMLSelectElement).value)}
                class="w-full p-2 border rounded"
                required
              >
                <option value="for">For</option>
                <option value="against">Against</option>
                <option value="undecided">Undecided</option>
              </select>
            </div>
            <div class="mb-2">
              <label htmlFor={`agent-voice-${index}`} class="block mb-1">Voice:</label>
              <select
                id={`agent-voice-${index}`}
                value={agent.voice}
                onChange={(e) => handleAgentDetailChange(index, "voice", (e.target as HTMLSelectElement).value)}
                class="w-full p-2 border rounded"
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
        ))}
      </div>
      <button
        type="button"
        onClick={toggleCustomAgents}
        class="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded"
      >
        {showCustomAgents ? "Use Predefined Personalities" : "Customize Agents"}
      </button>
    </div>
  );
}