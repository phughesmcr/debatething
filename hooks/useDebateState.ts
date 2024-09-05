import {
  MAX_AGENTS,
  MAX_DEBATE_ROUNDS,
  MIN_AGENTS,
  MIN_DEBATE_ROUNDS,
  validateDebateInput,
} from "lib/debate/inputValidation.ts";
import { getRandomPersonalities, Personality } from "lib/debate/personalities.ts";
import { clamp, sanitizeInput } from "lib/utils.ts";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { AgentDetails } from "routes/api/debate.tsx";
import { DEFAULT_VOICE, type VoiceType } from "routes/api/voicesynth.tsx";

type DebateMessage = { role: string; content: string };

export function useDebateState() {
  const [position, setPosition] = useState("");
  const [numAgents, setNumAgentsState] = useState(2);
  const [numDebateRounds, setNumDebateRounds] = useState(2);
  const [agentDetails, setAgentDetails] = useState<Required<Personality>[]>([]);
  const [debate, setDebate] = useState<Array<{ role: string; content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [context, setContext] = useState("");
  const [isDebating, setIsDebating] = useState(false);
  const [isDebateFinished, setIsDebateFinished] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [moderatorVoice, setModeratorVoice] = useState<VoiceType | "none">("nova");
  const [userUUID, setUserUUID] = useState<string>("");

  useEffect(() => {
    let uuid = sessionStorage?.getItem("userUUID");
    if (!uuid) {
      uuid = crypto.randomUUID();
      sessionStorage?.setItem("userUUID", uuid);
    }
    setUserUUID(uuid);
  }, []);

  const updateAgentDetails = useCallback((count: number) => {
    const clampedCount = clamp(count, MIN_AGENTS, MAX_AGENTS);
    const newAgentDetails = getRandomPersonalities(clampedCount).map((p, index) => ({
      ...p,
      stance: (index === 0 ? "for" : index === 1 ? "against" : "undecided"),
      voice: p.voice || DEFAULT_VOICE,
      name: p.name || `Agent ${index + 1}`,
      personality: p.personality || "",
    }));
    setAgentDetails(newAgentDetails as Required<Personality>[]);
  }, []);

  const setNumAgents = useCallback((count: number) => {
    if (isNaN(count)) {
      console.error("Invalid number of agents:", count);
      return;
    }
    const clampedCount = clamp(count, MIN_AGENTS, MAX_AGENTS);
    updateAgentDetails(clampedCount);
    setNumAgentsState(clampedCount);
  }, [updateAgentDetails]);

  useEffect(() => {
    if (agentDetails.length !== numAgents) {
      updateAgentDetails(numAgents);
    }
  }, [numAgents, agentDetails.length, updateAgentDetails]);

  const handleSubmit = useCallback(async (e: Event) => {
    e.preventDefault();
    setErrors([]);
    setIsDebateFinished(false);

    const sanitizedPosition = sanitizeInput(position);
    const sanitizedContext = sanitizeInput(context);

    const { errors, valid } = validateDebateInput({
      agentDetails: agentDetails as AgentDetails[],
      context: sanitizedContext,
      position: sanitizedPosition,
      numAgents,
      numDebateRounds,
      uuid: userUUID,
      moderatorVoice,
    });

    if (!valid) {
      setErrors(errors);
      return;
    }

    setLoading(true);
    setIsDebating(true);
    setDebate([]);

    abortControllerRef.current = new AbortController();

    try {
      // First, make a GET request to obtain the CSRF token
      const tokenResponse = await fetch("/api/csrf-token", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!tokenResponse.ok) {
        throw new Error(`HTTP error! status: ${tokenResponse.status}`);
      }

      const csrfToken = tokenResponse.headers.get("X-CSRF-Token");

      if (!csrfToken) {
        throw new Error("Failed to obtain CSRF token");
      }

      // Now make the actual POST request with the CSRF token
      const response = await fetch("/api/debate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          position: sanitizedPosition,
          context: sanitizedContext,
          numAgents,
          numDebateRounds,
          agentDetails,
          moderatorVoice,
          uuid: userUUID,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get response reader");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let currentMessage: DebateMessage | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonData = line.slice(6); // Remove 'data: ' prefix
            if (jsonData.trim() === "[DONE]") {
              setIsDebateFinished(true);
            } else {
              try {
                const message = JSON.parse(jsonData) as DebateMessage;
                setDebate((prevDebate) => {
                  const lastMessage = prevDebate[prevDebate.length - 1];
                  if (lastMessage && lastMessage.role === message.role) {
                    // Update the content of the last message
                    return [
                      ...prevDebate.slice(0, -1),
                      { ...lastMessage, content: lastMessage.content + message.content },
                    ];
                  } else {
                    // Add a new message
                    return [...prevDebate, message];
                  }
                });
                currentMessage = message;
              } catch (error) {
                console.error("Error parsing JSON:", error);
              }
            }
          }
        }
      }

      if (buffer) {
        // Process any remaining data in the buffer
        if (buffer.startsWith("data: ")) {
          const jsonData = buffer.slice(6);
          if (jsonData.trim() !== "[DONE]") {
            try {
              const message = JSON.parse(jsonData) as DebateMessage;
              if (currentMessage) {
                currentMessage.content += message.content;
                setDebate((prevDebate) => [...prevDebate, currentMessage!]);
              }
            } catch (error) {
              console.error("Error parsing JSON:", error);
            }
          }
        }
      }

      setIsDebateFinished(true);
    } catch (error) {
      if (error.name === "AbortError") {
        // Debate cancelled
      } else {
        console.error("Error in debate:", error);
        setErrors(["An error occurred while debating. Please try again."]);
      }
    } finally {
      setLoading(false);
      setIsDebating(false);
      abortControllerRef.current = null;
    }
  }, [position, numAgents, numDebateRounds, agentDetails, moderatorVoice, userUUID, context]);

  const cancelDebate = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsDebating(false);
      setLoading(false);
      setDebate([]);
      setIsDebateFinished(false);
      setErrors([]);
      setPosition("");
      setContext("");
      updateAgentDetails(numAgents);
    }
  }, [numAgents, updateAgentDetails]);

  const safeSetNumDebateRounds = useCallback((value: number | string) => {
    const parsedValue = parseInt(value as string, 10);
    if (!isNaN(parsedValue)) {
      setNumDebateRounds(clamp(parsedValue, MIN_DEBATE_ROUNDS, MAX_DEBATE_ROUNDS));
    }
  }, []);

  return {
    position,
    setPosition,
    numAgents,
    setNumAgents,
    numDebateRounds,
    setNumDebateRounds: safeSetNumDebateRounds,
    context,
    setContext,
    agentDetails,
    setAgentDetails,
    debate,
    errors,
    loading,
    isDebating,
    isDebateFinished,
    handleSubmit,
    cancelDebate,
    updateAgentDetails,
    moderatorVoice,
    setModeratorVoice,
    userUUID,
  };
}
