import { useCallback, useState } from "preact/hooks";

export const useAudioState = () => {
  const [audioQueue, setAudioQueue] = useState<Array<{ content: string; voice: string }>>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPlaybackPosition, setCurrentPlaybackPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [isSynthesizingAudio, setIsSynthesizingAudio] = useState(false);

  const resetAudioState = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.src = "";
    }
    setAudioQueue([]);
    setIsProcessingQueue(false);
    setCurrentAudio(null);
    setIsPaused(false);
    setCurrentPlaybackPosition(0);
    setCurrentQueueIndex(0);
    setIsLoading(false);
  }, [currentAudio]);

  return {
    audioQueue,
    setAudioQueue,
    isProcessingQueue,
    setIsProcessingQueue,
    currentAudio,
    setCurrentAudio,
    isPaused,
    setIsPaused,
    currentPlaybackPosition,
    setCurrentPlaybackPosition,
    isLoading,
    setIsLoading,
    currentQueueIndex,
    setCurrentQueueIndex,
    isSynthesizingAudio,
    setIsSynthesizingAudio,
    resetAudioState,
  };
};
