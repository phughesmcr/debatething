import AgentSelector from "islands/AgentSelector.tsx";
import {
  MAX_AGENTS,
  MAX_DEBATE_CONTEXT_LENGTH,
  MAX_DEBATE_ROUNDS,
  MAX_POSITION_LENGTH,
  MIN_AGENTS,
  MIN_DEBATE_ROUNDS,
} from "lib/debate/inputValidation.ts";
import type { Personality } from "lib/debate/personalities.ts";
import type { VoiceType } from "routes/api/voicesynth.tsx";

interface DebateFormInputsProps {
  position: string;
  setPosition: (value: string) => void;
  numAgents: number;
  setNumAgents: (value: number) => void;
  numDebateRounds: number;
  setNumDebateRounds: (value: number | string) => void;
  context: string;
  setContext: (value: string) => void;
  agentDetails: Required<Personality>[];
  setAgentDetails: (value: Required<Personality>[]) => void;
  errors: string[];
  loading: boolean;
  isDebating: boolean;
  handleSubmit: (e: Event) => void;
  cancelDebate: () => void;
  moderatorVoice: VoiceType | "none";
  setModeratorVoice: (value: VoiceType | "none") => void;
}

const EXAMPLE_POSITIONS = [
  "Pineapple belongs on pizza",
  "Cats are better pets than dogs",
  "The earth is flat and supported by giant turtles",
  "Unicorns would make great house pets",
  "Time travel should be a mandatory school subject",
  "Pizza is a vegetable",
  "Aliens built the pyramids",
  "Everyday should be a holiday",
  "Dinosaurs would have made excellent astronauts",
  "Coffee is better than sleep",
];

export default function DebateFormInputs(props: DebateFormInputsProps) {
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
    errors,
    loading,
    isDebating,
    handleSubmit,
    cancelDebate,
    moderatorVoice,
    setModeratorVoice,
  } = props;

  const onSubmitHandler = (e: Event) => {
    e.preventDefault();
    handleSubmit(e);
  };

  return (
    <form
      onSubmit={onSubmitHandler}
      class="space-y-6"
    >
      {!isDebating && (
        <>
          <div>
            <label htmlFor="position" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Debate Topic
            </label>
            <input
              type="text"
              id="position"
              value={position}
              placeholder={EXAMPLE_POSITIONS[Math.floor(Math.random() * EXAMPLE_POSITIONS.length)]}
              minLength={4}
              maxLength={MAX_POSITION_LENGTH}
              onInput={(e) => setPosition((e.target as HTMLInputElement).value)}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="numAgents" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of Participants
              </label>
              <input
                type="number"
                id="numAgents"
                value={numAgents}
                onInput={(e) => setNumAgents(parseInt((e.target as HTMLInputElement).value, 10))}
                min={MIN_AGENTS}
                max={MAX_AGENTS}
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>
            <div>
              <label htmlFor="numDebateRounds" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Number of Debate Rounds
              </label>
              <input
                type="number"
                id="numDebateRounds"
                value={numDebateRounds}
                onInput={(e) => setNumDebateRounds(parseInt((e.target as HTMLInputElement).value, 10))}
                min={MIN_DEBATE_ROUNDS}
                max={MAX_DEBATE_ROUNDS}
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>
            <div>
              <label htmlFor="moderatorVoice" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Moderator Voice
              </label>
              <select
                id="moderatorVoice"
                value={moderatorVoice}
                onChange={(e) => setModeratorVoice((e.target as HTMLSelectElement).value as VoiceType | "none")}
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="none">No Moderator</option>
                <option value="nova">Nova</option>
                <option value="alloy">Alloy</option>
                <option value="echo">Echo</option>
                <option value="shimmer">Shimmer</option>
                <option value="fable">Fable</option>
                <option value="onyx">Onyx</option>
              </select>
            </div>
          </div>

          <details class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <summary class="font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Customization & Participant Settings
            </summary>
            <div class="mt-4 space-y-4">
              <div>
                <label htmlFor="context" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Additional Context (optional)
                </label>
                <textarea
                  id="context"
                  value={context}
                  onInput={(e) => setContext((e.target as HTMLTextAreaElement).value)}
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  rows={3}
                  placeholder="Provide any additional context for the debate. This will help the participants understand the topic better. For example, where is the debate taking place?"
                  maxLength={MAX_DEBATE_CONTEXT_LENGTH}
                />
              </div>

              <div>
                <h3 class="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">Participant Details</h3>
                {agentDetails.length > 0 && (
                  <AgentSelector
                    agentDetails={agentDetails}
                    setAgentDetails={setAgentDetails}
                  />
                )}
              </div>
            </div>
          </details>
        </>
      )}

      {errors.length > 0 && (
        <div
          class="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded-md"
          role="alert"
        >
          <ul class="list-disc list-inside">
            {errors.map((error, index) => <li key={index}>{error}</li>)}
          </ul>
        </div>
      )}

      <div class="flex justify-between mt-2">
        {isDebating
          ? (
            <button
              type="button"
              onClick={cancelDebate}
              class="w-full mt-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition duration-150 ease-in-out"
            >
              Cancel Debate
            </button>
          )
          : (
            <button
              type="submit"
              disabled={loading}
              class={`w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              Start Debate
            </button>
          )}
      </div>
    </form>
  );
};
