import { Personality } from "lib/debate/personalities.ts";
import { VoiceType, isValidVoice } from "routes/api/voicesynth.tsx";

let audioQueue: Array<{ content: string; voice: string; id: number }> = [];
let isProcessingQueue = false;
let currentAudio: HTMLAudioElement | null = null;
let currentSynthesizingId: number | null = null;
let isPaused = false;
let currentPlaybackPosition = 0;
let isAudioCancelled = false;
let currentAudioIndex = 0;
let currentSynthesisController: AbortController | null = null;

export const handleAudioSynthesis = async (content: string, voice: string): Promise<HTMLAudioElement> => {
  console.log(`Synthesizing audio for voice: ${voice}`);
  currentSynthesisController = new AbortController();
  try {
    const response = await fetch("/api/voicesynth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: content, voice }),
      signal: currentSynthesisController.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    
    await new Promise((resolve, reject) => {
      audio.addEventListener('loadedmetadata', () => {
        console.log(`Audio synthesized for ${voice}, length:`, audio.duration);
        resolve(audio);
      });
      audio.addEventListener('error', (e) => reject(new Error(`Audio failed to load: ${e.message}`)));
    });

    return audio;
  } catch (error) {
    console.error("Error in handleAudioSynthesis:", error);
    throw error;
  } finally {
    currentSynthesisController = null;
  }
};

export const queueAudio = (content: string, voice: VoiceType, id: number) => {
  audioQueue.push({ content, voice, id });
};

const processQueue = async () => {
  if (isProcessingQueue || audioQueue.length === 0 || isPaused || isAudioCancelled) {
    return;
  }

  isProcessingQueue = true;

  while (currentAudioIndex < audioQueue.length && !isPaused && !isAudioCancelled) {
    const { content, voice, id } = audioQueue[currentAudioIndex];
    currentSynthesizingId = id;

    try {
      const audio = await handleAudioSynthesis(content, voice);
      if (isAudioCancelled) break;
      currentSynthesizingId = null;
      currentAudio = audio;
      if (!isPaused) {
        await playAudio(audio);
      }
      if (!isPaused && !isAudioCancelled) {
        currentAudio = null;
        currentPlaybackPosition = 0;
        currentAudioIndex++;
      }
    } catch (error) {
      console.error("Error processing audio queue:", error);
      currentAudioIndex++;
      currentSynthesizingId = null;
    }
  }

  if (currentAudioIndex >= audioQueue.length || isAudioCancelled) {
    currentAudioIndex = 0;
    isProcessingQueue = false;
  }
};

const playAudio = (audio: HTMLAudioElement): Promise<void> => {
  return new Promise((resolve) => {
    audio.onended = () => {
      if (!isPaused) {
        currentPlaybackPosition = 0;
        resolve();
      }
    };
    audio.currentTime = currentPlaybackPosition;
    audio.play().catch(console.error);
  });
};

export const pauseCurrentAudio = () => {
  isPaused = true;
  if (currentAudio) {
    currentAudio.pause();
    currentPlaybackPosition = currentAudio.currentTime;
  }
};

export const resumeCurrentAudio = () => {
  isPaused = false;
  if (currentAudio) {
    currentAudio.currentTime = currentPlaybackPosition;
    currentAudio.play().catch(console.error);
  } else if (audioQueue.length > 0) {
    processQueue();
  }
};

export const cancelAudioSynthesis = () => {
  isAudioCancelled = true;
  audioQueue = [];
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (currentSynthesisController) {
    currentSynthesisController.abort();
  }
  currentSynthesizingId = null;
  isPaused = false;
  currentPlaybackPosition = 0;
  currentAudioIndex = 0;
  isProcessingQueue = false;
};

export const playFullDebate = async (
  debate: Array<{ role: string; content: string }>,
  agentDetails: Required<Personality>[],
) => {
  cancelAudioSynthesis(); // Reset state before starting new debate
  isAudioCancelled = false;
  isPaused = false;
  currentPlaybackPosition = 0;
  currentAudioIndex = 0;
  audioQueue = [];
  debate.forEach((message, index) => {
    if (message.role !== "user" && message.role !== "system") {
      const voice: VoiceType = agentDetails.find((agent) => agent.name === message.role)?.voice || "nova";
      if (isValidVoice(voice)) {
        queueAudio(message.content, voice, index);
      } else {
        console.error(`Invalid voice type: ${voice}`);
      }
    }
  });
  await processQueue();
};

export const isPlaying = (): boolean => {
  return isProcessingQueue && !isPaused;
};

export const isAnySynthesizing = (): boolean => {
  return isProcessingQueue || currentSynthesizingId !== null;
};

export const getCurrentSynthesizingId = (): number | null => {
  return currentSynthesizingId;
};

export const isAudioPaused = (): boolean => {
  return isPaused;
};
