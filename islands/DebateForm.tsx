import { useState, useEffect } from "preact/hooks";
import { clamp } from "lib/utils.ts";
import { Personality, getRandomPersonalities } from "../lib/personalities.ts";
import { validateDebateInput } from "../lib/inputValidation.ts";
import { sanitizeInput } from "../lib/inputSanitizer.ts";

interface AgentDetails {
  name: string;
  personality: string;
  stance: "for" | "against" | "undecided";
}

const trimSystemMessage = (content: string): string => {
  if (content.includes('[SYSTEM]')) {
    return "";
  }
  return content;
};

export default function DebateForm() {
  const [position, setPosition] = useState("");
  const [numAgents, setNumAgents] = useState(2);
  const [agentDetails, setAgentDetails] = useState<Personality[]>([]);
  const [debate, setDebate] = useState<Array<{ role: string; content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [context, setContext] = useState("");
  const [hasDuplicateNames, setHasDuplicateNames] = useState(false);

  useEffect(() => {
    const initialAgents = getRandomPersonalities(clamp(numAgents, 2, 4)).map((p, index) => ({
      ...p,
      stance: index === 0 ? "for" : index === 1 ? "against" : "undecided"
    }));
    setAgentDetails(initialAgents);
  }, [numAgents]);

  const checkDuplicateNames = (details: Personality[]): boolean => {
    const names = details.map(agent => agent.name.toLowerCase());
    return new Set(names).size !== names.length;
  };

  const adjustAgentStances = (agents: AgentDetails[]): AgentDetails[] => {
    const forAgent = agents.find(agent => agent.stance === "for");
    const againstAgent = agents.find(agent => agent.stance === "against");

    if (forAgent && againstAgent) {
      return agents;
    }

    const adjustedAgents = [...agents];

    if (!forAgent) {
      const undecidedIndex = adjustedAgents.findIndex(agent => agent.stance === "undecided");
      if (undecidedIndex !== -1) {
        adjustedAgents[undecidedIndex].stance = "for";
      } else {
        adjustedAgents[0].stance = "for";
      }
    }

    if (!againstAgent) {
      const undecidedIndex = adjustedAgents.findIndex(agent => agent.stance === "undecided");
      if (undecidedIndex !== -1) {
        adjustedAgents[undecidedIndex].stance = "against";
      } else {
        const lastIndex = adjustedAgents.length - 1;
        adjustedAgents[lastIndex].stance = "against";
      }
    }

    return adjustedAgents;
  };

  const handleAgentDetailChange = (index: number, field: keyof Personality, value: string) => {
    setAgentDetails(prevDetails => {
      const newDetails = [...prevDetails];
      newDetails[index] = { ...newDetails[index], [field]: value };
      setHasDuplicateNames(checkDuplicateNames(newDetails));
      return newDetails;
    });
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setErrors([]);

    if (hasDuplicateNames) {
      setErrors(["Agent names must be unique"]);
      return;
    }

    const adjustedAgentDetails = adjustAgentStances(agentDetails);

    const input = {
      position: sanitizeInput(position),
      context: sanitizeInput(context),
      numAgents: clamp(numAgents, 2, 4),
      agentDetails: adjustedAgentDetails.map(agent => ({
        name: sanitizeInput(agent.name),
        personality: sanitizeInput(agent.personality),
        stance: agent.stance
      }))
    };
    const validationResult = validateDebateInput(input);

    if (!validationResult.valid) {
      setErrors(validationResult.errors);
      return;
    }

    setLoading(true);
    setDebate([]);

    try {
      const response = await fetch("/api/debate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch debate results");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get response reader");
      }

      let currentMessage = { role: "", content: "" };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.role && parsed.content) {
                if (currentMessage.role && currentMessage.role !== parsed.role) {
                  setDebate((prev) => [...prev, { ...currentMessage, content: trimSystemMessage(currentMessage.content) }]);
                  currentMessage = { role: parsed.role, content: parsed.content };
                } else {
                  currentMessage.role = parsed.role;
                  currentMessage.content += parsed.content;
                }
                setDebate((prev) => [...prev.slice(0, -1), { ...currentMessage, content: trimSystemMessage(currentMessage.content) }]);
              }
            } catch (error) {
              console.error("Error parsing SSE:", error);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setErrors(["An error occurred while fetching the debate results"]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} class="mb-8">
        <div class="mb-4">
          <label htmlFor="position-input" class="block mb-2">Position to debate:</label>
          <input
            id="position-input"
            type="text"
            value={position}
            aria-label="Position to debate"
            onInput={(e) => setPosition(sanitizeInput((e.target as HTMLInputElement).value))}
            class="w-full p-2 border rounded"
            maxLength={280}
            required
          />
        </div>
        <div class="mb-4">
          <label htmlFor="num-agents-input" class="block mb-2">Number of AI agents (2-4):</label>
          <input
            id="num-agents-input"
            type="number"
            min="2"
            max="4"
            value={numAgents}
            onInput={(e) => setNumAgents(parseInt(sanitizeInput((e.target as HTMLInputElement).value)))}
            class="w-full p-2 border rounded"
            aria-label="Number of AI agents"
            required
          />
        </div>

        <details class="mb-4">
          <summary class="cursor-pointer font-semibold">Advanced options</summary>
          <div class="mt-4 space-y-4">
            <div>
              <label htmlFor="context-input" class="block mb-2">Debate Context (Optional):</label>
              <textarea
                id="context-input"
                value={context}
                aria-label="Debate Context"
                onInput={(e) => setContext(sanitizeInput((e.target as HTMLTextAreaElement).value))}
                class="w-full p-2 border rounded"
                maxLength={500}
                rows={3}
                placeholder="Add optional context for the debate"
              />
            </div>

            <div>
              <h3 class="text-lg font-semibold mb-2">Agent Details</h3>
              {agentDetails.map((agent, index) => (
                <div key={index} class="mb-4 p-4 border rounded">
                  <h4 class="text-md font-semibold mb-2">Agent {index + 1}</h4>
                  <div class="mb-2">
                    <label htmlFor={`agent-name-${index}`} class="block mb-1">Name:</label>
                    <input
                      id={`agent-name-${index}`}
                      type="text"
                      value={agent.name}
                      onInput={(e) => handleAgentDetailChange(index, "name", sanitizeInput((e.target as HTMLInputElement).value))}
                      class="w-full p-2 border rounded"
                      maxLength={50}
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
                      maxLength={120}
                      required
                    />
                  </div>
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
                </div>
              ))}
              {hasDuplicateNames && (
                <p class="text-red-500 font-bold mt-2">Agent names must be unique</p>
              )}
            </div>
          </div>
        </details>

        {errors.length > 0 && (
          <div class="mb-4 text-red-500 font-bold">
            <ul>
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <button 
          type="submit" 
          class="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50" 
          disabled={loading || hasDuplicateNames}
        >
          {loading ? "Debating..." : "Start Debate"}
        </button>
      </form>

      {debate.length > 0 && (
        <div>
          <h2 class="text-2xl font-bold mb-4">Debate Results</h2>
          {debate.filter(message => message.role !== "user").map((message, index) => (
            <div key={index} class="mb-4">
              <strong>{agentDetails.find(agent => agent.name === message.role)?.name || message.role}:</strong> {message.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}