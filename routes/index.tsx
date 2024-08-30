import { Head } from "$fresh/runtime.ts";
import DebateForm from "../islands/DebateForm.tsx";

export default function Home() {
  return (
    <>
      <Head>
        <title>The Debate Machine</title>
      </Head>
      <div class="p-4 mx-auto max-w-screen-md">
        <h1 class="text-4xl font-bold mb-8">The Debate Machine</h1>
        <DebateForm />
      </div>
    </>
  );
}