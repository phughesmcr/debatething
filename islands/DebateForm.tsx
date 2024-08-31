import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { clamp } from "lib/utils.ts";
import { getRandomPersonalities, Personality } from "../lib/personalities.ts";
import {
  MAX_AGENTS,
  MAX_DEBATE_CONTEXT_LENGTH,
  MAX_DEBATE_ROUNDS,
  MAX_POSITION_LENGTH,
  MIN_AGENTS,
  MIN_DEBATE_ROUNDS,
  validateDebateInput,
} from "../lib/inputValidation.ts";
import { sanitizeInput } from "../lib/inputSanitizer.ts";
import { MODERATOR_NAME } from "../lib/debate.ts";
import AgentSelector from "./AgentSelector.tsx";

const trimSystemMessage = (content: string): string => {
  if (content.includes("[SYSTEM]")) {
    return "";
  }
  return content;
};

export default function DebateForm() {
  const [position, setPosition] = useState("");
  const [numAgents, setNumAgents] = useState(2);
  const [numDebateRounds, setNumDebateRounds] = useState(2);
  const [agentDetails, setAgentDetails] = useState<Required<Personality>[]>([]);
  const [debate, setDebate] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [context, setContext] = useState("");
  const [hasDuplicateNames, setHasDuplicateNames] = useState(false);
  const [hasDuplicateVoices, setHasDuplicateVoices] = useState(false);
  const [uuid, setUuid] = useState("");
  const [isDebating, setIsDebating] = useState(false);
  const [isDebateFinished, setIsDebateFinished] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [voiceSynthLoading, setVoiceSynthLoading] = useState<
    { [key: number]: boolean }
  >({});
  const [playingAudio, setPlayingAudio] = useState<number | null>(null);
  const audioRefs = useRef<{ [key: number]: HTMLAudioElement | null }>({});
  const [isFullDebatePlaying, setIsFullDebatePlaying] = useState(false);
  const isFullDebatePlayingRef = useRef(false);
  const fullDebateTimeoutRef = useRef<number | null>(null);
  const [synthesizedAudios, setSynthesizedAudios] = useState<Set<number>>(
    new Set(),
  );
  const [lastPlayedIndex, setLastPlayedIndex] = useState<number | null>(null);
  const [lastPlayedPosition, setLastPlayedPosition] = useState<number>(0);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const synthesisQueueRef = useRef<number[]>([]);
  const isSynthesizingRef = useRef(false);
  const preloadedIndicesRef = useRef<Set<number>>(new Set());
  const [isDebateAudioLoading, setIsDebateAudioLoading] = useState(false);
  const [allAudiosSynthesized, setAllAudiosSynthesized] = useState(false);
  const [isPreloadingAudios, setIsPreloadingAudios] = useState(false);

  useEffect(() => {
    // Generate a new UUID for each session
    setUuid(crypto.randomUUID());

    updateAgentDetails(numAgents);
  }, []);

  useEffect(() => {
    updateAgentDetails(numAgents);
  }, [numAgents]);

  const updateAgentDetails = (count: number) => {
    const clampedCount = clamp(count, 2, 4);
    const newAgentDetails = getRandomPersonalities(clampedCount).map((
      p,
      index,
    ) => ({
      ...p,
      stance: index === 0
        ? "for"
        : index === 1
        ? "against"
        : "undecided" as Personality["stance"],
    }));
    setAgentDetails(newAgentDetails as Required<Personality>[]);
  };

  useEffect(() => {
    if (isDebateFinished && debate.length > 0) {
      preloadInitialAudios();
    }
    return () => {
      // Cleanup audio objects
      Object.values(audioRefs.current).forEach((audio) => audio?.pause());
      audioRefs.current = {};
    };
  }, [debate, isDebateFinished]);

  const preloadInitialAudios = useCallback(() => {
    if (debate.length === 0) {
      return;
    }
    const initialIndex = debate.findIndex((_, index) => isAgentMessage(index));
    if (initialIndex !== -1) {
      for (let i = 0; i < 3; i++) {
        const indexToPreload = getNextPlayableIndex(initialIndex + i - 1);
        if (indexToPreload !== null) {
          queueAudioSynthesis(indexToPreload);
        }
      }
    }
  }, [debate]);

  const checkDuplicateNames = (details: Personality[]): boolean => {
    const names = details.map((agent) => agent.name.toLowerCase());
    return new Set(names).size !== names.length;
  };

  const checkDuplicateVoices = (details: Required<Personality>[]): boolean => {
    const voices = details.map((agent) => agent.voice);
    return new Set(voices).size !== voices.length;
  };

  const adjustAgentStances = (
    agents: Required<Personality>[],
  ): Required<Personality>[] => {
    const forAgent = agents.find((agent) => agent.stance === "for");
    const againstAgent = agents.find((agent) => agent.stance === "against");

    if (forAgent && againstAgent) {
      return agents;
    }

    const adjustedAgents = [...agents];

    if (!forAgent) {
      const undecidedIndex = adjustedAgents.findIndex((agent) =>
        agent.stance === "undecided"
      );
      if (undecidedIndex !== -1) {
        adjustedAgents[undecidedIndex].stance = "for";
      } else {
        adjustedAgents[0].stance = "for";
      }
    }

    if (!againstAgent) {
      const undecidedIndex = adjustedAgents.findIndex((agent) =>
        agent.stance === "undecided"
      );
      if (undecidedIndex !== -1) {
        adjustedAgents[undecidedIndex].stance = "against";
      } else {
        const lastIndex = adjustedAgents.length - 1;
        adjustedAgents[lastIndex].stance = "against";
      }
    }

    return adjustedAgents;
  };

  const handleAgentChange = (newAgents: Required<Personality>[]) => {
    setAgentDetails(newAgents);
    setHasDuplicateNames(checkDuplicateNames(newAgents));
    setHasDuplicateVoices(checkDuplicateVoices(newAgents));
  };

  const cancelDebate = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsDebating(false);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setErrors([]);
    setIsDebateFinished(false); // Reset debate status

    if (hasDuplicateNames) {
      setErrors(["Participant names must be unique"]);
      return;
    }

    if (hasDuplicateVoices) {
      setErrors(["Participant voices must be unique"]);
      return;
    }

    const adjustedAgentDetails = adjustAgentStances(agentDetails);

    const input = {
      position: sanitizeInput(position),
      context: sanitizeInput(context),
      numAgents: clamp(numAgents, 2, 4),
      numDebateRounds: clamp(
        numDebateRounds,
        MIN_DEBATE_ROUNDS,
        MAX_DEBATE_ROUNDS,
      ),
      agentDetails: adjustedAgentDetails.map((agent) => ({
        name: sanitizeInput(agent.name),
        personality: sanitizeInput(agent.personality),
        stance: agent.stance,
      })),
      uuid: uuid, // Include the UUID in the request
    };
    const validationResult = validateDebateInput(input);

    if (!validationResult.valid) {
      setErrors(validationResult.errors);
      return;
    }

    setLoading(true);
    setDebate([]);
    setIsDebating(true);

    try {
      abortControllerRef.current = new AbortController();
      const response = await fetch("/api/debate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
        signal: abortControllerRef.current.signal,
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
            if (data === "[DONE]") {
              setIsDebateFinished(true);
              break;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.role && parsed.content) {
                if (
                  currentMessage.role && currentMessage.role !== parsed.role
                ) {
                  setDebate((
                    prev,
                  ) => [...prev, {
                    ...currentMessage,
                    content: trimSystemMessage(currentMessage.content),
                  }]);
                  currentMessage = {
                    role: parsed.role,
                    content: parsed.content,
                  };
                } else {
                  currentMessage.role = parsed.role;
                  currentMessage.content += parsed.content;
                }
                setDebate((
                  prev,
                ) => [...prev.slice(0, -1), {
                  ...currentMessage,
                  content: trimSystemMessage(currentMessage.content),
                }]);
              }
            } catch (error) {
              console.error("Error parsing SSE:", error);
            }
          }
        }
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Debate cancelled");
      } else {
        console.error("Error:", error);
        setErrors(["An error occurred while fetching the debate results"]);
      }
    } finally {
      setLoading(false);
      setIsDebating(false);
      abortControllerRef.current = null;
    }
  };

  const isAgentMessage = (index: number) => {
    const message = debate[index];
    return message.role === MODERATOR_NAME ||
      agentDetails.some((agent) => agent.name === message.role);
  };

  const getNextPlayableIndex = (currentIndex: number) => {
    for (let i = currentIndex + 1; i < debate.length; i++) {
      if (isAgentMessage(i)) {
        return i;
      }
    }
    return null;
  };

  const resetPlaybackState = () => {
    setLastPlayedIndex(null);
    setLastPlayedPosition(0);
    setIsFullDebatePlaying(false);
    isFullDebatePlayingRef.current = false;
  };

  const handleFullDebatePlayback = async () => {
    if (isFullDebatePlayingRef.current) {
      isFullDebatePlayingRef.current = false;
      setIsFullDebatePlaying(false);
      if (fullDebateTimeoutRef.current) {
        clearTimeout(fullDebateTimeoutRef.current);
      }
      if (currentAudioRef.current) {
        setLastPlayedPosition(currentAudioRef.current.currentTime);
        currentAudioRef.current.pause();
      }
    } else {
      isFullDebatePlayingRef.current = true;
      setIsFullDebatePlaying(true);
      setIsDebateAudioLoading(true);

      let startIndex = lastPlayedIndex;
      let startPosition = lastPlayedPosition;

      if (startIndex === null || startIndex >= debate.length) {
        startIndex = debate.findIndex((message) =>
          isAgentMessage(debate.indexOf(message))
        );
        startPosition = 0;
      }

      if (startIndex !== -1) {
        await ensureNextAudiosReady(startIndex, 2);
        await resumePlayback(startIndex, startPosition);
      } else {
        resetPlaybackState();
      }
    }
  };

  const ensureNextAudiosReady = async (
    startIndex: number,
    count: number = 3,
  ) => {
    let currentIndex = startIndex;
    for (let i = 0; i < count; i++) {
      if (currentIndex < debate.length && isAgentMessage(currentIndex)) {
        await ensureAudioSynthesized(currentIndex);
      }
      currentIndex++;
    }
  };

  const resumePlayback = async (index: number, position: number) => {
    if (isAgentMessage(index)) {
      await ensureAudioSynthesized(index);
      const audio = audioRefs.current[index];
      if (audio) {
        audio.currentTime = position;
        currentAudioRef.current = audio;
        setIsDebateAudioLoading(false); // Audio is ready to play
        playNextInQueue(index);
      } else {
        console.error(`Audio not found for index: ${index}`);
        setIsDebateAudioLoading(false); // Reset loading state even if there's an error
        playNextInQueue(getNextPlayableIndex(index) ?? 0);
      }
    } else {
      setIsDebateAudioLoading(false); // Reset loading state for non-agent messages
      playNextInQueue(getNextPlayableIndex(index) ?? 0);
    }
  };

  const playNextInQueue = async (index: number) => {
    if (!isFullDebatePlayingRef.current || index >= debate.length) {
      resetPlaybackState();
      return;
    }

    if (!isAgentMessage(index)) {
      const nextIndex = getNextPlayableIndex(index);
      if (nextIndex !== null && nextIndex < debate.length) {
        playNextInQueue(nextIndex);
      } else {
        resetPlaybackState();
      }
      return;
    }

    setLastPlayedIndex(index);

    try {
      await ensureAudioSynthesized(index);
      const audio = audioRefs.current[index];
      if (!audio) {
        throw new Error(
          `Audio not found for index: ${index} after synthesis attempt`,
        );
      }

      currentAudioRef.current = audio;
      audio.onended = () => {
        const nextIndex = getNextPlayableIndex(index);
        if (nextIndex !== null && nextIndex < debate.length) {
          fullDebateTimeoutRef.current = setTimeout(
            () => playNextInQueue(nextIndex),
            10,
          );
        } else {
          resetPlaybackState();
        }
      };

      // Preload next three audios
      await ensureNextAudiosReady(index + 1, 3);
      await audio.play();
    } catch (error) {
      console.error(`Error playing audio for index ${index}:`, error);
      const nextIndex = getNextPlayableIndex(index);
      if (nextIndex !== null && nextIndex < debate.length) {
        fullDebateTimeoutRef.current = setTimeout(
          () => playNextInQueue(nextIndex),
          10,
        );
      } else {
        resetPlaybackState();
      }
    }
  };

  const queueAudioSynthesis = useCallback((index: number) => {
    if (!isAgentMessage(index) || index >= debate.length) {
      return;
    }
    if (
      !audioRefs.current[index] &&
      !synthesizedAudios.has(index) &&
      !synthesisQueueRef.current.includes(index) &&
      !preloadedIndicesRef.current.has(index)
    ) {
      synthesisQueueRef.current.push(index);
      preloadedIndicesRef.current.add(index);
      processSynthesisQueue();
    }
  }, [debate, synthesizedAudios]);

  const processSynthesisQueue = useCallback(async () => {
    if (isSynthesizingRef.current) return;

    isSynthesizingRef.current = true;

    try {
      while (synthesisQueueRef.current.length > 0) {
        const index = synthesisQueueRef.current[0];
        try {
          if (!audioRefs.current[index] && !synthesizedAudios.has(index)) {
            await synthesizeAudio(index);
          }
        } catch (error) {
          console.error(`Error synthesizing audio for index ${index}:`, error);
        } finally {
          synthesisQueueRef.current.shift();
        }
      }
    } finally {
      isSynthesizingRef.current = false;
    }
  }, [synthesizedAudios]);

  const synthesizeAudio = useCallback(async (index: number) => {
    if (audioRefs.current[index] || synthesizedAudios.has(index)) {
      return;
    }

    if (index >= debate.length) {
      console.warn(`Index ${index} is out of debate range`);
      return;
    }

    const message = debate[index];
    if (
      !message || typeof message !== "object" || !("role" in message) ||
      !("content" in message)
    ) {
      console.error(`Invalid message structure at index ${index}`);
      return;
    }

    let voice = message.role === MODERATOR_NAME
      ? "nova"
      : agentDetails.find((agent) => agent.name === message.role)?.voice;
    if (!voice) voice = "nova";

    try {
      const response = await fetch("/api/voicesynth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.content, voice }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to synthesize voice for index ${index}: ${response.statusText}`,
        );
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(`API error for index ${index}: ${data.error}`);
      }

      const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
      audioRefs.current[index] = audio;
      setSynthesizedAudios((prev) => {
        const newSet = new Set(prev).add(index);
        if (
          newSet.size ===
            debate.filter((_, index) => isAgentMessage(index)).length
        ) {
          setAllAudiosSynthesized(true);
        }
        return newSet;
      });
    } catch (error) {
      console.error(`Error in synthesizeAudio for index ${index}:`, error);
      throw error;
    }
  }, [debate, agentDetails]);

  const ensureAudioSynthesized = async (index: number): Promise<void> => {
    if (index >= debate.length) {
      console.warn(`Index ${index} is out of debate range`);
      return;
    }

    if (!audioRefs.current[index] && !synthesizedAudios.has(index)) {
      await synthesizeAudio(index);
    }
  };

  const handleVoiceSynth = async (
    index: number,
    content: string,
    voice: string,
    forceSynthesize: boolean = false,
  ) => {
    if (playingAudio === index && !isFullDebatePlayingRef.current) {
      audioRefs.current[index]?.pause();
      setPlayingAudio(null);
      return;
    }

    if (playingAudio !== null && !isFullDebatePlayingRef.current) {
      audioRefs.current[playingAudio]?.pause();
    }

    setVoiceSynthLoading((prev) => ({ ...prev, [index]: true }));
    try {
      if (!audioRefs.current[index] || forceSynthesize) {
        const response = await fetch("/api/voicesynth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content, voice }),
        });

        if (!response.ok) {
          throw new Error(
            `Failed to synthesize voice for index ${index}: ${response.statusText}`,
          );
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(`API error for index ${index}: ${data.error}`);
        }

        const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
        audioRefs.current[index] = audio;
        setSynthesizedAudios((prev) => new Set(prev).add(index));

        audio.addEventListener("ended", () => {
          if (!isFullDebatePlayingRef.current) {
            setPlayingAudio(null);
          }
        });
      } else {
        console.log(
          `Audio already exists for index: ${index}, skipping synthesis`,
        );
      }

      if (!isFullDebatePlayingRef.current) {
        await audioRefs.current[index]?.play();
        setPlayingAudio(index);
      }
    } catch (error) {
      console.error(`Error in handleVoiceSynth for index ${index}:`, error);
      setErrors(
        (prev) => [
          ...prev,
          `Failed to synthesize voice for message ${index + 1}`,
        ],
      );
      throw error; // Re-throw the error to be caught in playNextInQueue
    } finally {
      setVoiceSynthLoading((prev) => ({ ...prev, [index]: false }));
    }
  };

  const generateDownloadLinks = async () => {
    if (!allAudiosSynthesized) {
      setIsPreloadingAudios(true);
      try {
        const synthPromises = debate.map((_message, index) => {
          if (isAgentMessage(index) && !audioRefs.current[index]) {
            return synthesizeAudio(index);
          }
          return Promise.resolve();
        });
        await Promise.all(synthPromises);
      } finally {
        setIsPreloadingAudios(false);
      }
    }

    debate.forEach((_message, index) => {
      if (isAgentMessage(index) && audioRefs.current[index]) {
        const audio = audioRefs.current[index];
        const blob = dataURItoBlob(audio.src);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `debate_audio_${index}.mp3`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    });
  };

  const dataURItoBlob = (dataURI: string) => {
    const byteString = atob(dataURI.split(",")[1]);
    const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  return (
    <div>
      <form onSubmit={handleSubmit} class="mb-8">
        <div class="mb-4">
          <label htmlFor="position-input" class="block mb-2">
            Position to debate:
          </label>
          <input
            id="position-input"
            type="text"
            value={position}
            aria-label="Position to debate"
            onInput={(e) =>
              setPosition(sanitizeInput((e.target as HTMLInputElement).value))}
            class="w-full p-2 border rounded"
            maxLength={MAX_POSITION_LENGTH}
            placeholder="The moon is made of cheese"
            required
          />
        </div>
        <div class="mb-4 flex items-center space-x-4">
          <div class="flex-1">
            <label htmlFor="num-agents-input" class="block mb-2">
              Number of Participants (2-4):
            </label>
            <input
              id="num-agents-input"
              type="number"
              min={MIN_AGENTS}
              max={MAX_AGENTS}
              value={numAgents}
              onInput={(e) =>
                setNumAgents(
                  clamp(
                    parseInt(
                      sanitizeInput((e.target as HTMLInputElement).value),
                    ),
                    MIN_AGENTS,
                    MAX_AGENTS,
                  ),
                )}
              class="w-full p-2 border rounded"
              aria-label="Number of Participants"
              required
            />
          </div>
          <div class="flex-1">
            <label htmlFor="num-debate-rounds-input" class="block mb-2">
              Number of Debate Rounds (1-3):
            </label>
            <input
              id="num-debate-rounds-input"
              type="number"
              min={MIN_DEBATE_ROUNDS}
              max={MAX_DEBATE_ROUNDS}
              value={numDebateRounds}
              onInput={(e) =>
                setNumDebateRounds(
                  clamp(
                    parseInt(
                      sanitizeInput((e.target as HTMLInputElement).value),
                    ),
                    MIN_DEBATE_ROUNDS,
                    MAX_DEBATE_ROUNDS,
                  ),
                )}
              class="w-full p-2 border rounded"
              aria-label="Number of Debate Rounds"
              required
            />
          </div>
        </div>

        <details class="mb-4">
          <summary class="cursor-pointer font-semibold">
            Customization options
          </summary>
          <div class="mt-4 space-y-4">
            <div>
              <label htmlFor="context-input" class="block mb-2">
                Debate Context (Optional):
              </label>
              <textarea
                id="context-input"
                value={context}
                aria-label="Debate Context"
                onInput={(e) =>
                  setContext(
                    sanitizeInput((e.target as HTMLTextAreaElement).value),
                  )}
                class="w-full p-2 border rounded"
                maxLength={MAX_DEBATE_CONTEXT_LENGTH}
                rows={3}
                placeholder="Add optional context for the debate"
              />
            </div>

            <AgentSelector
              agents={agentDetails}
              onAgentChange={handleAgentChange}
            />

            {hasDuplicateNames && (
              <p class="text-red-500 font-bold mt-2">
                Agent names must be unique
              </p>
            )}
            {hasDuplicateVoices && (
              <p class="text-red-500 font-bold mt-2">
                Agent voices must be unique
              </p>
            )}
          </div>
        </details>

        {errors.length > 0 && (
          <div class="mb-4 text-red-500 font-bold">
            <ul>
              {errors.map((error, index) => <li key={index}>{error}</li>)}
            </ul>
          </div>
        )}

        <div class="flex space-x-4">
          <button
            type="submit"
            class="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            disabled={loading || hasDuplicateNames || hasDuplicateVoices ||
              isDebating}
          >
            {loading ? "Debating..." : "Start Debate"}
          </button>
          {isDebating && (
            <button
              type="button"
              onClick={cancelDebate}
              class="px-4 py-2 bg-red-500 text-white rounded"
            >
              Cancel
            </button>
          )}
          {isDebateFinished && (
            <button
              type="button"
              onClick={handleFullDebatePlayback}
              class={`px-4 py-2 ${
                isDebateAudioLoading
                  ? "bg-yellow-500"
                  : isFullDebatePlaying
                  ? "bg-red-500"
                  : "bg-green-500"
              } text-white rounded flex items-center justify-center`}
              disabled={isDebateAudioLoading}
            >
              {isDebateAudioLoading
                ? (
                  <>
                    <svg
                      class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        class="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        stroke-width="4"
                      >
                      </circle>
                      <path
                        class="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      >
                      </path>
                    </svg>
                    Loading...
                  </>
                )
                : isFullDebatePlaying
                ? "Pause Debate"
                : lastPlayedIndex !== null
                ? "Resume Debate"
                : "Listen to Debate"}
            </button>
          )}
          {isDebateFinished && (
            <button
              onClick={generateDownloadLinks}
              class="px-4 py-2 bg-purple-500 text-white rounded disabled:opacity-50"
              disabled={isPreloadingAudios}
            >
              {isPreloadingAudios
                ? "Preparing Audios..."
                : allAudiosSynthesized
                ? "Download All Audios"
                : "Prepare and Download All Audios"}
            </button>
          )}
        </div>
      </form>

      {debate.length > 0 && (
        <div>
          <h2 class="text-2xl font-bold mb-4">Debate Results</h2>
          {debate.map((message, index) => (
            <div
              key={index}
              class={`mb-4 flex items-start ${
                message.role === "user" || message.role === "system"
                  ? "hidden"
                  : ""
              }`}
            >
              <div class="flex-grow">
                <strong>{message.role}:</strong> {message.content}
              </div>
              {isDebateFinished && isAgentMessage(index) && (
                <button
                  onClick={() =>
                    handleVoiceSynth(
                      index,
                      message.content,
                      agentDetails.find((agent) => agent.name === message.role)
                        ?.voice!,
                    )}
                  disabled={voiceSynthLoading[index] || isFullDebatePlaying}
                  class="ml-2 px-2 py-1 bg-green-400 text-white rounded disabled:opacity-50 hidden"
                  aria-label={voiceSynthLoading[index] ||
                      (isFullDebatePlaying && playingAudio === index)
                    ? "Synthesizing audio"
                    : playingAudio === index
                    ? "Pause audio"
                    : synthesizedAudios.has(index)
                    ? "Play audio"
                    : "Generate audio"}
                >
                  {voiceSynthLoading[index] ||
                      (isFullDebatePlaying && playingAudio === index)
                    ? "Synthesizing..."
                    : playingAudio === index
                    ? "⏸️"
                    : synthesizedAudios.has(index)
                    ? "🔊"
                    : "🔊 (Generate)"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
