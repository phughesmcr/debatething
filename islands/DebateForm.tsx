import AudioControls from "components/AudioControls.tsx";
import DebateDisplay from "components/DebateDisplay.tsx";
import DebateFormInputs from "components/DebateFormInputs.tsx";
import { useAudioControls } from "hooks/useAudioControls.ts";
import { useDebateState } from "hooks/useDebateState.ts";

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

  const {
    isPlaying,
    isLoading,
    handlePlayPause,
  } = useAudioControls(debate, agentDetails);

  return (
    <div>
      <DebateFormInputs
        position={position}
        setPosition={setPosition}
        numAgents={numAgents}
        setNumAgents={setNumAgents}
        numDebateRounds={numDebateRounds}
        setNumDebateRounds={setNumDebateRounds}
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
          debate={debate}
          agentDetails={agentDetails}
        />
      )}

      {debate.length > 0 && (
        <DebateDisplay
          debate={debate}
          agentDetails={agentDetails}
          isDebateFinished={isDebateFinished}
        />
      )}
    </div>
  );
}
