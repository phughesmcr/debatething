import AgentSelector from "islands/AgentSelector.tsx";
import {
  MAX_AGENTS,
  MAX_DEBATE_CONTEXT_LENGTH,
  MAX_DEBATE_ROUNDS,
  MAX_POSITION_LENGTH,
  MIN_AGENTS,
  MIN_DEBATE_ROUNDS,
} from "lib/debate/inputValidation.ts";
import { Personality } from "lib/debate/personalities.ts";

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

const DebateFormInputs = ({
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
}: DebateFormInputsProps) => {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(e);
      }}
      class="space-y-6"
    >
      <div>
        <label htmlFor="position" class="block text-sm font-medium text-gray-700 mb-2">
          Debate Position
        </label>
        <input
          type="text"
          id="position"
          value={position}
          placeholder={EXAMPLE_POSITIONS[Math.floor(Math.random() * EXAMPLE_POSITIONS.length)]}
          minLength={4}
          maxLength={MAX_POSITION_LENGTH}
          onInput={(e) => setPosition((e.target as HTMLInputElement).value)}
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="numAgents" class="block text-sm font-medium text-gray-700 mb-2">
            Number of Participants
          </label>
          <input
            type="number"
            id="numAgents"
            value={numAgents}
            onInput={(e) => setNumAgents(parseInt((e.target as HTMLInputElement).value, 10))}
            min={MIN_AGENTS}
            max={MAX_AGENTS}
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        <div>
          <label htmlFor="numDebateRounds" class="block text-sm font-medium text-gray-700 mb-2">
            Number of Debate Rounds
          </label>
          <input
            type="number"
            id="numDebateRounds"
            value={numDebateRounds}
            onInput={(e) => setNumDebateRounds(parseInt((e.target as HTMLInputElement).value, 10))}
            min={MIN_DEBATE_ROUNDS}
            max={MAX_DEBATE_ROUNDS}
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
      </div>

      <details class="bg-gray-50 p-3 rounded-lg">
        <summary class="font-medium text-gray-700 cursor-pointer">Customization & Participant Settings</summary>
        <div class="mt-4 space-y-6">
          <div>
            <label htmlFor="context" class="block text-sm font-medium text-gray-700 mb-2">
              Additional Context (optional)
            </label>
            <textarea
              id="context"
              value={context}
              onInput={(e) => setContext((e.target as HTMLTextAreaElement).value)}
              class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              maxLength={MAX_DEBATE_CONTEXT_LENGTH}
            />
          </div>

          <div>
            <h3 class="text-lg font-medium text-gray-700 mb-4">Participant Details</h3>
            {agentDetails.length > 0 && (
              <AgentSelector
                agentDetails={agentDetails}
                setAgentDetails={setAgentDetails}
              />
            )}
          </div>
        </div>
      </details>

      {errors.length > 0 && (
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md" role="alert">
          <ul class="list-disc list-inside">
            {errors.map((error, index) => <li key={index}>{error}</li>)}
          </ul>
        </div>
      )}

      <div class="flex justify-between">
        {isDebating ? (
          <button
            type="button"
            onClick={cancelDebate}
            class="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition duration-150 ease-in-out"
          >
            Cancel Debate
          </button>
        ) : (
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

export default DebateFormInputs;
