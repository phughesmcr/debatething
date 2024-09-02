import { useEffect, useState } from 'preact/hooks';

interface AudioControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  isSynthesizingAudio: boolean;
  handlePlayPause: () => void;
}

export default function AudioControls({ isPlaying, isLoading, isSynthesizingAudio, handlePlayPause }: AudioControlsProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [buttonState, setButtonState] = useState<'play' | 'pause' | 'resume' | 'loading'>('play');

  useEffect(() => {
    if (isLoading || isSynthesizingAudio) {
      setButtonState('loading');
    } else if (isPlaying) {
      setButtonState('pause');
    } else {
      setButtonState(buttonState === 'pause' ? 'resume' : 'play');
    }
  }, [isPlaying, isLoading, isSynthesizingAudio]);

  const getButtonText = () => {
    switch (buttonState) {
      case 'play': return 'Listen to Debate';
      case 'pause': return 'Pause';
      case 'resume': return 'Resume';
      case 'loading': return 'Loading...';
    }
  };

  const handleClick = () => {
    if (isPlaying || isPaused) {
      setIsPaused(!isPaused);
    }
    handlePlayPause();
  };

  return (
    <button
      onClick={handleClick}
      disabled={buttonState === 'loading'}
      className={`w-full mt-2 px-4 py-2 rounded text-white font-bold ${
        buttonState === 'pause' ? 'bg-yellow-400' :
        buttonState === 'loading' ? 'bg-gray-500 cursor-not-allowed' :
        'bg-green-400'
      }`}
    >
      {getButtonText()}
    </button>
  );
}
