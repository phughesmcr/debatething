import DebateForm from "islands/DebateForm.tsx";
import DarkModeToggle from "../islands/DarkModeToggle.tsx";

export default function Home() {
  return (
    <div class="p-4 mx-auto max-w-screen-md">
      <div class="flex justify-between items-center mb-3">
        <h1 class="text-4xl font-bold mb-3 mt-3">
          DebateThing.com
        </h1>
        <DarkModeToggle />
      </div>
      <p class="text-sm text-gray-500 mb-3">
        DebateThing.com is an experimental tool for creating simulated debates.{" "}
        It uses OpenAI's GPT-4o-Mini model to generate debates and TTS-1 to synthesize voice audio.{" "}
        <span class="font-semibold">
          Remember, AI can make mistakes and even hallucinate. Don't believe everything you read or hear.{" "}
        </span>
      </p>
      <p class="text-sm text-gray-500 mb-3">
        DebateThing is{" "}
        <a
          href="https://github.com/phughesmcr/debatething"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-500 hover:underline cursor-pointer"
        >
          Open Source,{" "}
        </a>
        made with{" "}
        <a
          href="http://fresh.deno.dev"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-500 hover:underline cursor-pointer"
        >
          Deno Fresh
        </a>
        , and hosted on{" "}
        <a
          href="https://www.deno.com/deploy"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-500 hover:underline cursor-pointer"
        >
          Deno Deploy
        </a>
        .{" "}
        <a
          href="http://phugh.es"
          target="_blank"
          rel="noopener noreferrer"
          class="text-blue-500 hover:underline cursor-pointer"
        >
          Hire me
        </a>
        .
      </p>
      <DebateForm />
    </div>
  );
}
