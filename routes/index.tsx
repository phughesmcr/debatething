import DebateForm from "islands/DebateForm.tsx";

export default function Home() {
  return (
    <div class="p-4 mx-auto max-w-screen-md">
      <h1 class="text-4xl font-bold mb-8 mt-3">DebateThing.com</h1>
      <DebateForm />
      <p class="text-sm text-gray-500">
        DebateThing.com is a tool for creating and participating in simulated debates. It uses OpenAI's GPT-4o-Mini model to generate debate outcomes; remember, AI can make mistakes, can even hallucinate. Don't believe everything you read.
      </p>
    </div>
  );
}
