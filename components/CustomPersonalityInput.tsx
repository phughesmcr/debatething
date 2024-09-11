import { MAX_PERSONALITY_LENGTH } from "lib/debate/inputValidation.ts";
import { personalities } from "lib/debate/personalities.ts";
import { cleanContent, sanitizeInput } from "lib/utils.ts";
import { useEffect, useState } from "preact/hooks";

interface CustomPersonalityInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

export default function CustomPersonalityInput(props: CustomPersonalityInputProps) {
  const { id, value, onChange } = props;
  const [selectedOption, setSelectedOption] = useState<string>("custom");
  const [customInput, setCustomInput] = useState<string>(value);

  // Personality dropdown handler
  useEffect(() => {
    const sanitizedValue = cleanContent(sanitizeInput(value));
    const matchingPersonality = personalities.find((p) => p.personality === sanitizedValue);
    if (matchingPersonality) {
      setSelectedOption(matchingPersonality.name);
    } else {
      setSelectedOption("custom");
      setCustomInput(sanitizedValue);
    }
  }, [value]);

  const handleSelectChange = (e: Event) => {
    const selected = (e.target as HTMLSelectElement).value;
    setSelectedOption(selected);
    if (selected === "custom") {
      setSelectedOption("custom");
      setCustomInput(value);
      onChange(customInput);
    } else {
      const personality = personalities.find((p) => p.name === selected);
      if (personality) {
        onChange(personality.personality);
      } else {
        setSelectedOption("custom");
        setCustomInput(value);
      }
    }
  };

  const handleCustomInputChange = (e: Event) => {
    const newValue = cleanContent(sanitizeInput((e.target as HTMLTextAreaElement).value));
    setCustomInput(newValue);
    onChange(newValue);
  };

  return (
    <div class="space-y-2 CustomPersonalityInput">
      <select
        id={id}
        value={selectedOption}
        onChange={handleSelectChange}
        aria-label="Select personality"
        aria-expanded={selectedOption === "custom"}
        class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      >
        <option value="custom">Custom</option>
        {personalities.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
      </select>
      {selectedOption === "custom" && (
        <textarea
          name={id}
          value={customInput}
          onChange={handleCustomInputChange}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          maxLength={MAX_PERSONALITY_LENGTH}
          rows={3}
          placeholder="Enter custom personality..."
          aria-description="Enter a custom personality description for the debate participant."
        />
      )}
    </div>
  );
}
