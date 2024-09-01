import { useEffect, useState } from "preact/hooks";

interface AudioControlsProps {
  isFullDebatePlaying: boolean;
  isDebateAudioLoading: boolean;
  isSynthesizing: boolean;
  handleFullDebatePlayback: () => Promise<void>;
  handleCancelSynthesis: () => void;
  handlePauseResume: () => void;
}

const AudioControls = ({
  isFullDebatePlaying,
  isDebateAudioLoading,
  isSynthesizing,
  handleFullDebatePlayback,
  handleCancelSynthesis,
  handlePauseResume,
}: AudioControlsProps) => {
  const [buttonText, setButtonText] = useState("Listen to Debate");

  useEffect(() => {
    if (isDebateAudioLoading) {
      setButtonText("Loading...");
    } else if (isSynthesizing) {
      setButtonText("Cancel Synthesis");
    } else if (isFullDebatePlaying) {
      setButtonText("Pause Debate");
    } else {
      setButtonText("Listen to Debate");
    }
  }, [isDebateAudioLoading, isSynthesizing, isFullDebatePlaying]);

  const handleClick = () => {
    if (isSynthesizing) {
      handleCancelSynthesis();
    } else if (isFullDebatePlaying) {
      handlePauseResume();
    } else {
      handleFullDebatePlayback().catch(console.error);
    }
  };

  return (
    <button
      onClick={handleClick}
      class={`px-4 py-2 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out ${
        isDebateAudioLoading
          ? "bg-yellow-500 cursor-not-allowed"
          : isSynthesizing
          ? "bg-red-500 hover:bg-red-600 focus:ring-red-500"
          : isFullDebatePlaying
          ? "bg-blue-500 hover:bg-blue-600 focus:ring-blue-500"
          : "bg-green-500 hover:bg-green-600 focus:ring-green-500"
      }`}
      disabled={isDebateAudioLoading}
    >
      {buttonText}
    </button>
  );
};

export default AudioControls;
