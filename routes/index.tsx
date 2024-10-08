import OutwardLink from "components/OutwardLink.tsx";
import DarkModeToggle from "islands/DarkModeToggle.tsx";
import DebateForm from "islands/DebateForm.tsx";

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
        <OutwardLink href="https://github.com/phughesmcr/debatething">
          Open Source,{" "}
        </OutwardLink>
        made with{" "}
        <OutwardLink href="http://fresh.deno.dev">
          Deno Fresh
        </OutwardLink>
        , and hosted on{" "}
        <OutwardLink href="https://www.deno.com/deploy">
          Deno Deploy
        </OutwardLink>
        . It is made available under the{" "}
        <OutwardLink href="https://opensource.org/license/mit">
          MIT License
        </OutwardLink>
        .{" "}
        <OutwardLink href="http://phugh.es">
          Hire me
        </OutwardLink>
        .
      </p>
      <DebateForm />
    </div>
  );
}
