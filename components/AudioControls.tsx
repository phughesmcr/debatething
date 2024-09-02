import { useAudioControls } from 'hooks/useAudioControls.ts';
import type { Personality } from 'lib/debate/personalities.ts';

interface AudioControlsProps {
  debate: Array<{ role: string; content: string }>;
  agentDetails: Required<Personality>[];
}

export default function AudioControls({ debate, agentDetails }: AudioControlsProps) {
  const { isPlaying, isLoading, isSynthesizingAudio, handlePlayPause } = useAudioControls(debate, agentDetails);

  const buttonText = isPlaying ? 'Pause' : isLoading || isSynthesizingAudio ? 'Loading...' : 'Listen to Debate';

  return (
    <button
      onClick={handlePlayPause}
      disabled={isLoading || isSynthesizingAudio}
      className={`w-full mt-2 px-4 py-2 rounded ${isPlaying ? 'bg-yellow-500' : 'bg-green-500'} text-white font-bold`}
    >
      {buttonText}
    </button>
  );
}
