import { useState, useEffect } from 'preact/hooks';
import { isPlaying, isAudioPaused } from 'lib/audioUtils.ts';

interface AudioControlsProps {
  isFullDebatePlaying: boolean;
  isDebateAudioLoading: boolean;
  isSynthesizing: boolean;
  handleFullDebatePlayback: () => void;
  handleCancelSynthesis: () => void;
  handlePauseResume: () => void;
}

export default function AudioControls({
  isFullDebatePlaying,
  isDebateAudioLoading,
  isSynthesizing,
  handleFullDebatePlayback,
  handleCancelSynthesis,
  handlePauseResume
}: AudioControlsProps) {
  const [playbackState, setPlaybackState] = useState('idle');

  useEffect(() => {
    const updatePlaybackState = () => {
      if (isFullDebatePlaying) {
        setPlaybackState(isPlaying() ? 'playing' : 'paused');
      } else {
        setPlaybackState('idle');
      }
    };

    updatePlaybackState();
    const intervalId = setInterval(updatePlaybackState, 500);
    return () => clearInterval(intervalId);
  }, [isFullDebatePlaying]);

  const getButtonText = () => {
    if (isDebateAudioLoading) return 'Loading...';
    if (playbackState === 'playing') return 'Pause';
    if (playbackState === 'paused') return 'Resume';
    return 'Listen to Debate';
  };

  const handleMainButtonClick = () => {
    if (playbackState === 'idle') {
      handleFullDebatePlayback();
    } else {
      handlePauseResume();
    }
  };

  return (
    <div class="flex justify-between gap-2 mt-2">
      <button 
        onClick={handleMainButtonClick}
        disabled={isDebateAudioLoading || isSynthesizing}
        class={`w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition duration-150 ease-in-out ${
          isDebateAudioLoading || isSynthesizing ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        {getButtonText()}
      </button>
      {isFullDebatePlaying && (
        <button 
          onClick={handleCancelSynthesis}
          class="w-full ml-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition duration-150 ease-in-out"
        >
          Stop
        </button>
      )}
    </div>
  );
}
