import { useState, useEffect, useRef } from "preact/hooks";
import { clamp } from "lib/utils.ts";
import { Personality, getRandomPersonalities } from "../lib/personalities.ts";
import { validateDebateInput } from "../lib/inputValidation.ts";
import { sanitizeInput } from "../lib/inputSanitizer.ts";
import { MODERATOR_NAME } from "../lib/debate.ts";

const trimSystemMessage = (content: string): string => {
  if (content.includes('[SYSTEM]')) {
    return "";
  }
  return content;
};

export default function DebateForm() {
  const [position, setPosition] = useState("");
  const [numAgents, setNumAgents] = useState(2);
  const [agentDetails, setAgentDetails] = useState<Required<Personality>[]>([]);
  const [debate, setDebate] = useState<Array<{ role: string; content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [context, setContext] = useState("");
  const [hasDuplicateNames, setHasDuplicateNames] = useState(false);
  const [uuid, setUuid] = useState("");
  const [isDebating, setIsDebating] = useState(false);
  const [isDebateFinished, setIsDebateFinished] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [voiceSynthLoading, setVoiceSynthLoading] = useState<{ [key: number]: boolean }>({});
  const [playingAudio, setPlayingAudio] = useState<number | null>(null);
  const audioRefs = useRef<{ [key: number]: HTMLAudioElement | null }>({});
  const [isFullDebatePlaying, setIsFullDebatePlaying] = useState(false);
  const isFullDebatePlayingRef = useRef(false);
  const fullDebateTimeoutRef = useRef<number | null>(null);
  const [synthesizedAudios, setSynthesizedAudios] = useState<Set<number>>(new Set());
  const [lastPlayedIndex, setLastPlayedIndex] = useState<number | null>(null);
  const [lastPlayedPosition, setLastPlayedPosition] = useState<number>(0);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // Generate a new UUID for each session
    setUuid(crypto.randomUUID());

    const initialAgents = getRandomPersonalities(clamp(numAgents, 2, 4)).map((p, index) => ({
      ...p,
      stance: index === 0 ? "for" : index === 1 ? "against" : "undecided" as Personality["stance"]
    }));
    setAgentDetails(initialAgents as Required<Personality>[]);
  }, []);

  const checkDuplicateNames = (details: Personality[]): boolean => {
    const names = details.map(agent => agent.name.toLowerCase());
    return new Set(names).size !== names.length;
  };

  const adjustAgentStances = (agents: Required<Personality>[]): Required<Personality>[] => {
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
      })),
      uuid: uuid  // Include the UUID in the request
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
      if (error.name === 'AbortError') {
        console.log('Debate cancelled');
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
    return message.role === MODERATOR_NAME || agentDetails.some(agent => agent.name === message.role);
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
    setIsPlaying(false);
    setIsFullDebatePlaying(false);
    isFullDebatePlayingRef.current = false;
  };

  const handleFullDebatePlayback = async () => {
    console.log("handleFullDebatePlayback called");
    if (isFullDebatePlayingRef.current) {
      console.log("Pausing debate playback");
      isFullDebatePlayingRef.current = false;
      setIsFullDebatePlaying(false);
      setIsPlaying(false);
      if (fullDebateTimeoutRef.current) {
        clearTimeout(fullDebateTimeoutRef.current);
      }
      if (currentAudioRef.current) {
        setLastPlayedPosition(currentAudioRef.current.currentTime);
        currentAudioRef.current.pause();
      }
    } else {
      console.log("Starting or resuming debate playback");
      isFullDebatePlayingRef.current = true;
      setIsFullDebatePlaying(true);
      
      let startIndex = lastPlayedIndex;
      let startPosition = lastPlayedPosition;

      if (startIndex === null || startIndex >= debate.length) {
        startIndex = debate.findIndex(message => isAgentMessage(debate.indexOf(message)));
        startPosition = 0;
      }

      if (startIndex !== -1) {
        await resumePlayback(startIndex, startPosition);
      } else {
        console.log("No playable messages found in the debate");
        resetPlaybackState();
      }
    }
  };

  const resumePlayback = async (index: number, position: number) => {
    console.log(`Resuming playback from index ${index} at position ${position}`);
    if (isAgentMessage(index)) {
      await ensureAudioSynthesized(index);
      const audio = audioRefs.current[index];
      if (audio) {
        audio.currentTime = position;
        currentAudioRef.current = audio;
        playNextInQueue(index);
      } else {
        console.error(`Audio not found for index: ${index}`);
        playNextInQueue(getNextPlayableIndex(index) ?? 0);
      }
    } else {
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
      if (nextIndex !== null) {
        playNextInQueue(nextIndex);
      } else {
        console.log("No more playable messages");
        resetPlaybackState();
      }
      return;
    }

    setLastPlayedIndex(index);
    console.log(`Preparing to play audio for index: ${index}`);

    try {
      const wasSynthesized = await ensureAudioSynthesized(index);
      console.log(`Synthesis result for index ${index}: ${wasSynthesized ? 'synthesized' : 'not synthesized'}`);

      const audio = audioRefs.current[index];
      if (!audio) {
        throw new Error(`Audio not found for index: ${index} after synthesis attempt`);
      }

      setIsPlaying(true);
      currentAudioRef.current = audio;
      audio.onended = () => {
        console.log(`Audio ended for index: ${index}`);
        const nextIndex = getNextPlayableIndex(index);
        if (nextIndex !== null) {
          fullDebateTimeoutRef.current = setTimeout(() => playNextInQueue(nextIndex), 1000);
        } else {
          console.log("Playback finished");
          resetPlaybackState();
        }
      };
      await audio.play();
    } catch (error) {
      console.error(`Error playing audio for index ${index}:`, error);
      const nextIndex = getNextPlayableIndex(index);
      if (nextIndex !== null) {
        fullDebateTimeoutRef.current = setTimeout(() => playNextInQueue(nextIndex), 1000);
      } else {
        console.log("No more playable messages after error");
        resetPlaybackState();
      }
    }
  };

  const ensureAudioSynthesized = async (index: number): Promise<boolean> => {
    if (index < debate.length) {
      const message = debate[index];
      let voice = message.role === MODERATOR_NAME ? "nova" : agentDetails.find(agent => agent.name === message.role)?.voice;
      if (!voice) voice = "nova";
      console.log(`Checking synthesis for index: ${index}, role: ${message.role}, voice: ${voice}`);
      if (voice && (!audioRefs.current[index] || !synthesizedAudios.has(index))) {
        console.log(`Attempting to synthesize audio for index: ${index}`);
        try {
          await handleVoiceSynth(index, message.content, voice, true);
          // Add a small delay to ensure the audio is loaded
          await new Promise(resolve => setTimeout(resolve, 100));
          if (!audioRefs.current[index]) {
            throw new Error(`Audio not created after synthesis for index: ${index}`);
          }
          return true;
        } catch (error) {
          console.error(`Failed to synthesize audio for index: ${index}`, error);
          return false;
        }
      } else {
        console.log(`Audio already exists for index: ${index}, skipping synthesis`);
      }
    } else {
      console.warn(`Index ${index} is out of debate range`);
    }
    return false;
  };

  const handleVoiceSynth = async (index: number, content: string, voice: string, forceSynthesize: boolean = false) => {
    console.log(`handleVoiceSynth called for index: ${index}, forceSynthesize: ${forceSynthesize}`);
    if (playingAudio === index && !isFullDebatePlayingRef.current) {
      console.log("Pausing current audio");
      audioRefs.current[index]?.pause();
      setPlayingAudio(null);
      return;
    }

    if (playingAudio !== null && !isFullDebatePlayingRef.current) {
      console.log("Pausing previously playing audio");
      audioRefs.current[playingAudio]?.pause();
    }

    setVoiceSynthLoading(prev => ({ ...prev, [index]: true }));
    try {
      if (!audioRefs.current[index] || forceSynthesize) {
        console.log(`Fetching new audio from API for index: ${index}`);
        const response = await fetch("/api/voicesynth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content, voice }),
        });

        if (!response.ok) throw new Error(`Failed to synthesize voice for index ${index}: ${response.statusText}`);

        const data = await response.json();
        if (data.error) throw new Error(`API error for index ${index}: ${data.error}`);

        console.log(`Creating new Audio object for index: ${index}`);
        const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
        audioRefs.current[index] = audio;
        setSynthesizedAudios(prev => new Set(prev).add(index));

        audio.addEventListener('ended', () => {
          console.log(`Audio playback ended for index: ${index}`);
          if (!isFullDebatePlayingRef.current) {
            setPlayingAudio(null);
          }
        });
      } else {
        console.log(`Audio already exists for index: ${index}, skipping synthesis`);
      }

      if (!isFullDebatePlayingRef.current) {
        console.log(`Playing individual audio for index: ${index}`);
        await audioRefs.current[index]?.play();
        setPlayingAudio(index);
      }
    } catch (error) {
      console.error(`Error in handleVoiceSynth for index ${index}:`, error);
      setErrors(prev => [...prev, `Failed to synthesize voice for message ${index + 1}`]);
      throw error; // Re-throw the error to be caught in playNextInQueue
    } finally {
      setVoiceSynthLoading(prev => ({ ...prev, [index]: false }));
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

        <div class="flex space-x-4">
          <button 
            type="submit" 
            class="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50" 
            disabled={loading || hasDuplicateNames || isDebating}
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
              class="px-4 py-2 bg-green-500 text-white rounded"
            >
              {isFullDebatePlaying 
                ? "Pause Debate" 
                : lastPlayedIndex !== null 
                  ? "Resume Debate" 
                  : "Listen to Debate"}
            </button>
          )}
        </div>
      </form>

      {debate.length > 0 && (
        <div>
          <h2 class="text-2xl font-bold mb-4">Debate Results</h2>
          {debate.map((message, index) => (
            <div key={index} class={`mb-4 flex items-start ${message.role === "user" || message.role === "system" ? "hidden" : ""}`}>
              <div class="flex-grow">
                <strong>{message.role}:</strong> {message.content}
              </div>
              {isDebateFinished && isAgentMessage(index) && (
                <button
                  onClick={() => handleVoiceSynth(index, message.content, agentDetails.find(agent => agent.name === message.role)?.voice!)}
                  disabled={voiceSynthLoading[index] || isFullDebatePlaying}
                  class="ml-2 px-2 py-1 bg-green-400 text-white rounded disabled:opacity-50 hidden"
                >
                  {voiceSynthLoading[index] || (isFullDebatePlaying && playingAudio === index) ? "Synthesizing..." : playingAudio === index ? "⏸️" : synthesizedAudios.has(index) ? "🔊" : "🔊 (Generate)"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}