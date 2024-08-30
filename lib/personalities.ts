export interface Personality {
    name: string;
    personality: string;
  }
  
  export const personalities: Personality[] = [
    { name: "Logical Larry", personality: "Analytical and fact-based, always seeking empirical evidence." },
    { name: "Emotional Emma", personality: "Empathetic and passionate, focusing on feelings and personal experiences." },
    { name: "Creative Charlie", personality: "Innovative and out-of-the-box thinker, proposing unique solutions." },
    { name: "Skeptical Sarah", personality: "Doubtful and questioning, always looking for potential flaws in arguments." },
    { name: "Optimistic Oliver", personality: "Positive and solution-oriented, seeing opportunities in every challenge." },
    { name: "Pragmatic Paula", personality: "Practical and results-focused, concerned with real-world applications." },
    { name: "Philosophical Phil", personality: "Deep thinker, exploring underlying principles and ethical implications." },
    { name: "Historical Hannah", personality: "Drawing from past events and precedents to inform current debates." },
  ];
  
  export function getRandomPersonalities(count: number): Personality[] {
    const shuffled = [...personalities].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }