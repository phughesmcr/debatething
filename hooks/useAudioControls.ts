import {
  hasAudioStarted,
  isAudioLoading,
  isPlaying,
  pauseResumeAudio,
  playFullDebate,
  resetAudioState,
  isSynthesizing
} from 'lib/audioUtils.ts';
import type { Personality } from 'lib/debate/personalities.ts';
import { useCallback, useEffect, useState } from 'preact/hooks';

export function useAudioControls(debate: Array<{ role: string; content: string }>, agentDetails: Required<Personality>[]) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSynthesizingAudio, setIsSynthesizingAudio] = useState(false);

  useEffect(() => {
    const checkStatus = () => {
      setIsLoading(isAudioLoading());
      setIsSynthesizingAudio(isSynthesizing());
    };

    const intervalId = setInterval(checkStatus, 100);
    return () => clearInterval(intervalId);
  }, []);

  const handlePlayPause = useCallback(async () => {
    if (isPlaying()) {
      pauseResumeAudio();
    } else {
      setIsLoading(true);
      setIsSynthesizingAudio(true);
      if (!hasAudioStarted()) {
        resetAudioState();
        await playFullDebate(debate, agentDetails);
      } else {
        pauseResumeAudio();
      }
      setIsLoading(false);
      setIsSynthesizingAudio(false);
    }
  }, [debate, agentDetails]);

  return {
    isPlaying: isPlaying(),
    isLoading,
    isSynthesizingAudio,
    handlePlayPause,
  };
}
