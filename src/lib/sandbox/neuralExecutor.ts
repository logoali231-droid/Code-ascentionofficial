import { SandboxResult } from "./types";

export async function runNeural(
  code: string,
  language: string,
  signal?: AbortSignal
): Promise<SandboxResult> {
  if (signal?.aborted) {
    return { output: [], error: "Aborted" };
  }

  return {
    output: [
      `[NEURAL SIMULATION] ${language}`,
      "code analyzed but not executed",
    ],
  };
}