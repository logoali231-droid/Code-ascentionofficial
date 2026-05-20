"use client";

import { SandboxResult } from "./types";
import { connectSandboxSocket } from "./sandboxSocket";

export async function runRemote(
  code: string,
  language: string,
  signal?: AbortSignal,
): Promise<SandboxResult> {
  const socket = await connectSandboxSocket();

  return new Promise((resolve) => {
    const cleanup = () => {
      signal?.removeEventListener("abort", abort);
    };

    const abort = () => {
      cleanup();
      socket.send(JSON.stringify({ type: "abort" }));

      resolve({
        output: [],
        error: "Aborted",
      });
    };

    signal?.addEventListener("abort", abort);

    socket.onmessage = (e) => {
      cleanup();
      const data = JSON.parse(e.data);

      resolve({
        output: data.output ?? [],
        error: data.error,
      });
    };

    socket.onerror = () => {
      cleanup();
      resolve({ output: [], error: "Socket error" });
    };

    socket.send(JSON.stringify({ type: "run", code, language }));
  });
}