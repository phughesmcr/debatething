import { pauseResumeAudio, playFullDebate, processQueue } from "lib/audioUtils.ts";
import type { Personality } from "lib/debate/personalities.ts";
import { useCallback, useEffect, useMemo } from "preact/hooks";
import { useAudioState } from "./useAudioState.ts";

export const useAudioControls = (
  debate: Array<{ role: string; content: string }>,
  agentDetails: Required<Personality>[],
) => {
  const audioState = useAudioState();

  const {
    isProcessingQueue,
    isPaused,
    isLoading,
    isSynthesizingAudio,
    audioQueue,
    currentQueueIndex,
    resetAudioState,
    setIsProcessingQueue,
  } = audioState;

  const isPlaying = useMemo(() => isProcessingQueue && !isPaused, [isProcessingQueue, isPaused]);

  useEffect(() => {
    return () => {
      resetAudioState();
    };
  }, []);

  useEffect(() => {
    if (audioQueue.length > 0 && !isProcessingQueue && !isPaused) {
      processQueue(audioState);
    }
  }, [audioQueue, isProcessingQueue, isPaused]);

  const handlePlayPause = useCallback(() => {
    if (audioQueue.length === 0 && currentQueueIndex === 0) {
      playFullDebate(debate, agentDetails, audioState).then(() => {
        setIsProcessingQueue(true);
        processQueue(audioState);
      });
    } else {
      pauseResumeAudio(audioState);
    }
  }, [debate, agentDetails, audioState, audioQueue, currentQueueIndex]);

  return {
    isPlaying,
    isLoading,
    isSynthesizingAudio,
    handlePlayPause,
  };
};
