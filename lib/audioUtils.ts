import { Personality } from "lib/debate/personalities.ts";

const audioRefs: { [key: number]: HTMLAudioElement } = {};
let audioQueue: Array<{ content: string; voice: string; id: number }> = [];
let isProcessingQueue = false;
let currentAudio: HTMLAudioElement | null = null;
let currentSynthesizingId: number | null = null;
let isPaused = false;
let currentPlaybackPosition = 0;

export const handleAudioSynthesis = async (content: string, voice: string): Promise<HTMLAudioElement> => {
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

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }

    const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
    
    // Wait for the audio metadata to load before returning
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
  }
};

export const queueAudio = (content: string, voice: string, id: number) => {
  audioQueue.push({ content, voice, id });
  if (!isProcessingQueue && !isPaused) {
    processQueue();
  }
};

const processQueue = async () => {
  if (audioQueue.length === 0 || isPaused) {
    isProcessingQueue = false;
    currentSynthesizingId = null;
    return;
  }

  isProcessingQueue = true;
  const { content, voice, id } = audioQueue[0];
  currentSynthesizingId = id;

  try {
    const audio = await handleAudioSynthesis(content, voice);
    audioQueue.shift(); // Remove the processed item from the queue
    currentSynthesizingId = null;
    currentAudio = audio;
    await playAudio(audio);
    currentAudio = null;
    currentPlaybackPosition = 0;
    processQueue();
  } catch (error) {
    console.error("Error processing audio queue:", error);
    audioQueue.shift(); // Remove the failed item from the queue
    currentSynthesizingId = null;
    isProcessingQueue = false;
    processQueue(); // Continue with the next item in the queue
  }
};

const playAudio = (audio: HTMLAudioElement): Promise<void> => {
  return new Promise((resolve) => {
    audio.onended = () => resolve();
    audio.currentTime = currentPlaybackPosition;
    audio.play();
  });
};

export const pauseCurrentAudio = () => {
  if (currentAudio) {
    currentAudio.pause();
    currentPlaybackPosition = currentAudio.currentTime;
    isPaused = true;
  }
};

export const resumeCurrentAudio = () => {
  if (currentAudio) {
    currentAudio.currentTime = currentPlaybackPosition;
    currentAudio.play();
    isPaused = false;
    if (!isProcessingQueue) {
      processQueue();
    }
  }
};

export const isAnySynthesizing = () => currentSynthesizingId !== null;

export const getCurrentSynthesizingId = () => currentSynthesizingId;

export async function playFullDebate(
  debate: Array<{ role: string; content: string }>,
  agentDetails: Required<Personality>[],
) {
  isPaused = false;
  currentPlaybackPosition = 0;
  audioQueue = [];
  debate.forEach((message, index) => {
    if (message.role !== "user" && message.role !== "system") {
      const voice = agentDetails.find((agent) => agent.name === message.role)?.voice || "nova";
      queueAudio(message.content, voice, index);
    }
  });
}
