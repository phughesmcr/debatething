import { useAudioState } from "hooks/useAudioState.ts";
import { Personality } from "lib/debate/personalities.ts";
import { VoiceType, isValidVoice } from "routes/api/voicesynth.tsx";

export const handleAudioSynthesis = async (
  content: string,
  voice: string,
  setIsLoading: (value: boolean) => void,
  setIsSynthesizingAudio: (value: boolean) => void
): Promise<HTMLAudioElement> => {
  setIsLoading(true);
  setIsSynthesizingAudio(true);
    try {
    const response = await fetch("/api/voicesynth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: content, voice }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    await new Promise((resolve, reject) => {
      audio.addEventListener('loadedmetadata', () => {
                resolve(audio);
      });
      audio.addEventListener('error', (e) => reject(new Error(`Audio failed to load: ${e.message}`)));
    });

    setIsLoading(false);
    setIsSynthesizingAudio(false);
    return audio;
  } catch (error) {
    setIsLoading(false);
    setIsSynthesizingAudio(false);
    console.error("Error in handleAudioSynthesis:", error);
    throw error;
  }
};

export const processQueue = async (audioState: ReturnType<typeof useAudioState>) => {
  const {
    audioQueue,
    isProcessingQueue,
    isPaused,
    currentQueueIndex,
    setIsProcessingQueue,
    setCurrentAudio,
    setCurrentPlaybackPosition,
    setCurrentQueueIndex,
    setIsPaused,
  } = audioState;

  if (isProcessingQueue || audioQueue.length === 0) {
    return;
  }

  setIsProcessingQueue(true);

  for (let i = currentQueueIndex; i < audioQueue.length; i++) {
    if (isPaused) {
      setIsProcessingQueue(false);
      break;
    }

    const { content, voice } = audioQueue[i];
    try {
      const audio = await handleAudioSynthesis(content, voice, audioState.setIsLoading, audioState.setIsSynthesizingAudio);
      if (isPaused) {
        setIsProcessingQueue(false);
        break;
      }
      setCurrentAudio(audio);
      await playAudio(audio, audioState);
      if (isPaused) {
        setIsProcessingQueue(false);
        break;
      }
      setCurrentAudio(null);
      setCurrentPlaybackPosition(0);
      setCurrentQueueIndex(i + 1);
    } catch (error) {
      console.error("Error processing audio queue:", error);
    }
  }

  if (!isPaused) {
    setIsProcessingQueue(false);
    setIsPaused(true);
  }
};

const playAudio = (audio: HTMLAudioElement, audioState: ReturnType<typeof useAudioState>): Promise<void> => {
  return new Promise((resolve) => {
    audio.addEventListener('ended', () => resolve(), { once: true });
    audio.currentTime = audioState.currentPlaybackPosition;
    audio.play().catch(console.error);
  });
};

export const pauseResumeAudio = (audioState: ReturnType<typeof useAudioState>) => {
  const { currentAudio, isPaused, audioQueue, setIsPaused, setCurrentPlaybackPosition } = audioState;

  if (currentAudio) {
    if (isPaused) {
      currentAudio.play().catch(console.error);
    } else {
      currentAudio.pause();
      setCurrentPlaybackPosition(currentAudio.currentTime);
    }
    setIsPaused(!isPaused);
  } else if (isPaused) {
    setIsPaused(false);
    processQueue(audioState);
  } else if (audioQueue.length > 0) {
    setIsPaused(true);
  }
};

export const playFullDebate = async (
  debate: Array<{ role: string; content: string }>,
  agentDetails: Required<Personality>[],
  audioState: ReturnType<typeof useAudioState>
) => {
  const { setIsPaused, setCurrentPlaybackPosition, setCurrentQueueIndex, setAudioQueue, setIsLoading, setIsSynthesizingAudio } = audioState;

  setIsPaused(false);
  setCurrentPlaybackPosition(0);
  setCurrentQueueIndex(0);
  setIsLoading(true);
  setIsSynthesizingAudio(true);

  const newAudioQueue = debate.reduce((queue, message) => {
    if (message.role !== "user" && message.role !== "system") {
      const voice: VoiceType = agentDetails.find((agent) => agent.name === message.role)?.voice || "nova";
      if (isValidVoice(voice)) {
        queue.push({ content: message.content, voice });
      } else {
        console.error(`Invalid voice type: ${voice}`);
      }
    }
    return queue;
  }, [] as Array<{ content: string; voice: string }>);

  setAudioQueue(newAudioQueue);
  setIsLoading(false);
  setIsSynthesizingAudio(false);
};
