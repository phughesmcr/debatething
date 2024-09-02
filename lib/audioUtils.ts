import { Personality } from "lib/debate/personalities.ts";
import { VoiceType, isValidVoice } from "routes/api/voicesynth.tsx";

let audioQueue: Array<{ content: string; voice: string }> = [];
let isProcessingQueue = false;
let currentAudio: HTMLAudioElement | null = null;
let isPaused = false;
let currentPlaybackPosition = 0;
let isLoading = false;
let currentQueueIndex = 0;

let isSynthesizingAudio = false;

export const isSynthesizing = (): boolean => {
  return isSynthesizingAudio;
};

export const handleAudioSynthesis = async (content: string, voice: string): Promise<HTMLAudioElement> => {
  isLoading = true;
  isSynthesizingAudio = true;
  console.log(`Synthesizing audio for voice: ${voice}`);
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
        console.log(`Audio synthesized for ${voice}, length:`, audio.duration);
        resolve(audio);
      });
      audio.addEventListener('error', (e) => reject(new Error(`Audio failed to load: ${e.message}`)));
    });

    isLoading = false;
    isSynthesizingAudio = false;
    return audio;
  } catch (error) {
    isLoading = false;
    isSynthesizingAudio = false;
    console.error("Error in handleAudioSynthesis:", error);
    throw error;
  }
};



const processQueue = async () => {
  if (isProcessingQueue || audioQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  for (let i = currentQueueIndex; i < audioQueue.length; i++) {
    if (isPaused) break;

    const { content, voice } = audioQueue[i];
    try {
      const audio = await handleAudioSynthesis(content, voice);
      if (isPaused) break;
      currentAudio = audio;
      await playAudio(audio);
      if (isPaused) break;
      currentAudio = null;
      currentPlaybackPosition = 0;
      currentQueueIndex = i + 1;
    } catch (error) {
      console.error("Error processing audio queue:", error);
    }
  }

  isProcessingQueue = false;
};

const playAudio = (audio: HTMLAudioElement): Promise<void> => {
  return new Promise((resolve) => {
    audio.addEventListener('ended', () => resolve(), { once: true });
    audio.currentTime = currentPlaybackPosition;
    audio.play().catch(console.error);
  });
};

export const pauseResumeAudio = () => {
  if (currentAudio) {
    if (isPaused) {
      currentAudio.play().catch(console.error);
    } else {
      currentAudio.pause();
      currentPlaybackPosition = currentAudio.currentTime;
    }
    isPaused = !isPaused;
  } else if (isPaused) {
    isPaused = false;
    processQueue();
  } else if (audioQueue.length > 0) {
    isPaused = true;
  }
};

export const isPlaying = (): boolean => {
  return isProcessingQueue && !isPaused;
};

export const isAudioLoading = (): boolean => {
  return isLoading;
};

export const hasAudioStarted = (): boolean => {
  return audioQueue.length > 0 || currentQueueIndex > 0;
};

export const playFullDebate = async (
  debate: Array<{ role: string; content: string }>,
  agentDetails: Required<Personality>[],
) => {
  isPaused = false;
  currentPlaybackPosition = 0;
  currentQueueIndex = 0;
  audioQueue = [];
  isLoading = true;
  isSynthesizingAudio = true;
  debate.forEach((message) => {
    if (message.role !== "user" && message.role !== "system") {
      const voice: VoiceType = agentDetails.find((agent) => agent.name === message.role)?.voice || "nova";
      if (isValidVoice(voice)) {
        audioQueue.push({ content: message.content, voice });
      } else {
        console.error(`Invalid voice type: ${voice}`);
      }
    }
  });
  isLoading = false;
  isSynthesizingAudio = false;
  await processQueue();
};

export const resetAudioState = () => {
  audioQueue = [];
  isProcessingQueue = false;
  currentAudio = null;
  isPaused = false;
  currentPlaybackPosition = 0;
  currentQueueIndex = 0;
  isLoading = false;
};
