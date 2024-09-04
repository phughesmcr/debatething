import { type VoiceType } from "routes/api/voicesynth.tsx";
import moderatorResponses from "./moderatorResponses.json" with { type: "json" };

export const MODERATOR_NAME = "Moderator";

export class Moderator {
  private usedResponses: Set<string> = new Set();
  private encoder: TextEncoder;
  private controller: ReadableStreamDefaultController<Uint8Array>;
  readonly voice: VoiceType | "none";

  constructor(controller: ReadableStreamDefaultController<Uint8Array>, voice: VoiceType | "none") {
    this.encoder = new TextEncoder();
    this.controller = controller;
    this.voice = voice;
  }

  private getRandomResponse(
    category: keyof typeof moderatorResponses,
    replacements: Record<string, string> = {},
  ): string {
    const responses = moderatorResponses[category];
    let unusedResponses = responses.filter((r) => !this.usedResponses.has(r));

    if (unusedResponses.length === 0) {
      this.usedResponses.clear();
      unusedResponses = responses;
    }

    const randomIndex = Math.floor(Math.random() * unusedResponses.length);
    const selectedResponse = unusedResponses[randomIndex];
    this.usedResponses.add(selectedResponse);

    return Object.entries(replacements).reduce(
      (str, [key, value]) => str.replace(`{${key}}`, value),
      selectedResponse,
    );
  }

  sendMessage(content: string) {
    this.controller.enqueue(
      this.encoder.encode(
        `data: ${JSON.stringify({ role: MODERATOR_NAME, content })}\n\n`,
      ),
    );
  }

  welcome(position: string) {
    this.sendMessage(this.getRandomResponse("welcome", { position }));
  }

  introduceAgent(name: string, personality: string, stance: string) {
    this.sendMessage(this.getRandomResponse("introduction", {
      name,
      personality,
      stance: stance === "undecided" ? `"undecided" on` : stance === "for" ? `"for"` : `"against"`,
    }));
  }

  announceOpeningStatements() {
    this.sendMessage(
      "Now, let's hear your opening statements. ",
    );
  }

  requestOpeningStatement(name: string) {
    this.sendMessage(
      this.getRandomResponse("openingStatement", { name }),
    );
  }

  thankAgent(name: string) {
    this.sendMessage(
      this.getRandomResponse("thankYou", { name }),
    );
  }

  announceDebateRound(round: number) {
    this.sendMessage(
      this.getRandomResponse("debateRound", { round: round.toString() }),
    );
  }

  requestResponse(name: string) {
    this.sendMessage(
      this.getRandomResponse("response", { name }),
    );
  }

  announceConcludingStatements() {
    this.sendMessage(
      `We've now reached the concluding statements portion of our debate. `,
    );
  }

  requestConcludingStatement(name: string) {
    this.sendMessage(
      this.getRandomResponse("concludingStatement", { name }),
    );
  }

  closeDebate() {
    this.sendMessage(this.getRandomResponse("closing"));
  }
}
