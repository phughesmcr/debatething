import { useState, useEffect } from "preact/hooks";
import { useDebateState } from "hooks/useDebateState.ts";
import DebateFormInputs from "components/DebateFormInputs.tsx";
import DebateDisplay from "components/DebateDisplay.tsx";
import AudioControls from "components/AudioControls.tsx";
import { handleAudioSynthesis, playFullDebate, pauseCurrentAudio, resumeCurrentAudio, isAnySynthesizing, getCurrentSynthesizingId, cancelAudioSynthesis, isPlaying } from "lib/audioUtils.ts";

export default function DebateForm() {
  const {
    position,
    setPosition,
    numAgents,
    setNumAgents,
    numDebateRounds,
    setNumDebateRounds,
    context,
    setContext,
    agentDetails,
    setAgentDetails,
    debate,
    errors,
    loading,
    isDebating,
    isDebateFinished,
    handleSubmit,
    cancelDebate,
  } = useDebateState();

  const [isFullDebatePlaying, setIsFullDebatePlaying] = useState(false);
  const [isDebateAudioLoading, setIsDebateAudioLoading] = useState(false);
  const [currentSynthesizingId, setCurrentSynthesizingId] = useState<number | null>(null);

  useEffect(() => {
    const checkSynthesisStatus = () => {
      setCurrentSynthesizingId(getCurrentSynthesizingId());
      setIsFullDebatePlaying(isPlaying());
    };

    const intervalId = setInterval(checkSynthesisStatus, 1000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const checkPlaybackStatus = () => {
      setIsFullDebatePlaying(isPlaying());
      setCurrentSynthesizingId(getCurrentSynthesizingId());
    };

    const intervalId = setInterval(checkPlaybackStatus, 500);

    return () => clearInterval(intervalId);
  }, []);

  const handleFullDebatePlayback = async () => {
    if (isFullDebatePlaying) {
      await pauseCurrentAudio();
      setIsFullDebatePlaying(false);
    } else {
      setIsDebateAudioLoading(true);
      try {
        playFullDebate(debate, agentDetails);
        setIsFullDebatePlaying(true);
      } catch (error) {
        console.error("Error playing full debate:", error);
      } finally {
        setIsDebateAudioLoading(false);
      }
    }
  };
  
  const handlePauseResume = async () => {
    if (isFullDebatePlaying) {
      await pauseCurrentAudio();
    } else {
      await resumeCurrentAudio();
    }
    setIsFullDebatePlaying(!isFullDebatePlaying);
  };

  const handleCancelSynthesis = () => {
    cancelAudioSynthesis();
    setIsFullDebatePlaying(false);
  };

  const safeSetNumDebateRounds = (value: number | string) => {
    const parsedValue = parseInt(value as string, 10);
    if (!isNaN(parsedValue)) {
      setNumDebateRounds(parsedValue);
    }
  };

  return (
    <div>
     <DebateFormInputs
        position={position}
        setPosition={setPosition}
        numAgents={numAgents}
        setNumAgents={setNumAgents}
        numDebateRounds={numDebateRounds}
        setNumDebateRounds={safeSetNumDebateRounds}
        context={context}
        setContext={setContext}
        agentDetails={agentDetails}
        setAgentDetails={setAgentDetails}
        errors={errors}
        loading={loading}
        isDebating={isDebating}
        handleSubmit={handleSubmit}
        cancelDebate={cancelDebate}
      />

      {isDebateFinished && (
        <AudioControls
          isFullDebatePlaying={isFullDebatePlaying}
          isDebateAudioLoading={isDebateAudioLoading}
          isSynthesizing={isAnySynthesizing()}
          handleFullDebatePlayback={handleFullDebatePlayback}
          handleCancelSynthesis={handleCancelSynthesis}
          handlePauseResume={handlePauseResume}
        />
      )}

      {debate.length > 0 && (
        <DebateDisplay
          debate={debate}
          agentDetails={agentDetails}
          isDebateFinished={isDebateFinished}
          handleAudioSynthesis={handleAudioSynthesis}
          currentSynthesizingId={currentSynthesizingId}
        />
      )}
    </div>
  );
}
