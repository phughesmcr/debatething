import { useState, useEffect } from "preact/hooks";
import { clamp } from "lib/utils.ts";
import { Personality, getRandomPersonalities } from "../lib/personalities.ts";

interface AgentDetails {
  name: string;
  personality: string;
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

  useEffect(() => {
    setAgentDetails(getRandomPersonalities(clamp(numAgents, 2, 4)));
  }, [numAgents]);

  const handleAgentDetailChange = (index: number, field: keyof Personality, value: string) => {
    setAgentDetails(prevDetails => {
      const newDetails = [...prevDetails];
      newDetails[index] = { ...newDetails[index], [field]: value };
      return newDetails;
    });
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setLoading(true);
    setDebate([]);

    try {
      const response = await fetch("/api/debate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ position, numAgents: clamp(numAgents, 2, 4), agentDetails }),
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
      // Handle error (e.g., show error message to user)
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
            onInput={(e) => setPosition((e.target as HTMLInputElement).value)}
            class="w-full p-2 border rounded"
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
            onInput={(e) => setNumAgents(parseInt((e.target as HTMLInputElement).value))}
            class="w-full p-2 border rounded"
            aria-label="Number of AI agents"
            required
          />
        </div>

        {agentDetails.map((agent, index) => (
          <div key={index} class="mb-4">
            <h3 class="text-lg font-semibold mb-2">Agent {index + 1}</h3>
            <div class="mb-2">
              <label htmlFor={`agent-name-${index}`} class="block mb-1">Name:</label>
              <input
                id={`agent-name-${index}`}
                type="text"
                value={agent.name}
                onInput={(e) => handleAgentDetailChange(index, "name", (e.target as HTMLInputElement).value)}
                class="w-full p-2 border rounded"
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
                required
              />
            </div>
          </div>
        ))}

        <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded" disabled={loading}>
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