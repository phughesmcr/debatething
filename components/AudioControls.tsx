import { useEffect, useState } from "preact/hooks";

interface AudioControlsProps {
  isPlaying: boolean;
  isLoading: boolean;
  isSynthesizingAudio: boolean;
  handlePlayPause: () => void;
}

export default function AudioControls(props: AudioControlsProps) {
  const { isPlaying, isLoading, isSynthesizingAudio, handlePlayPause } = props;
  const [buttonState, setButtonState] = useState<"play" | "pause" | "resume" | "loading">("play");

  useEffect(() => {
    if (isLoading || isSynthesizingAudio) {
      setButtonState("loading");
    } else if (isPlaying) {
      setButtonState("pause");
    } else if (buttonState === "pause") {
      setButtonState("resume");
    } else {
      setButtonState("play");
    }
  }, [isPlaying, isLoading, isSynthesizingAudio]);

  const getButtonText = () => {
    switch (buttonState) {
      case "play":
        return "Listen to Debate";
      case "pause":
        return "Pause";
      case "resume":
        return "Resume";
      case "loading":
        return "Loading...";
    }
  };

  return (
    <button
      onClick={handlePlayPause}
      disabled={buttonState === "loading"}
      className={`w-full mt-2 px-4 py-2 rounded text-white font-bold ${
        buttonState === "pause"
          ? "bg-orange-400"
          : buttonState === "loading"
          ? "bg-gray-500 cursor-not-allowed"
          : "bg-green-500"
      }`}
    >
      {getButtonText()}
    </button>
  );
}
