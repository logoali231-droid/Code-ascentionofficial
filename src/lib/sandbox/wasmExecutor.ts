"use client";

import { SandboxResult } from "./types";

export async function runWasm(
  code: string,
  language: string,
  signal?: AbortSignal,
): Promise<SandboxResult> {
  if (signal?.aborted) {
    return { output: [], error: "Aborted" };
  }

  return new Promise((resolve) => {
    const worker = new Worker(
      new URL("../workers/logic.worker.ts", import.meta.url),
    );

    const timeout = setTimeout(() => {
      worker.terminate();
      resolve({ output: [], error: "WASM timeout" });
    }, 10000);

    worker.onmessage = (e) => {
      clearTimeout(timeout);
      worker.terminate();

      resolve({
        output: e.data.output ?? [],
        error: e.data.error,
      });
    };

    worker.postMessage({ code, language });
  });
}