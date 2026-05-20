import { IEngineExecutor, SandboxResult } from "./types";
import { connectSandboxSocket } from "./sandboxSocket";

export class RemoteExecutor implements IEngineExecutor {
  async run(
    code: string,
    language: string,
    signal?: AbortSignal,
  ): Promise<SandboxResult> {
    if (signal?.aborted) {
      return { output: [], error: "Execution aborted." };
    }

    const socket = await connectSandboxSocket();

    return new Promise((resolve, reject) => {
      const abortHandler = () => {
        cleanup();
        socket.send(JSON.stringify({ type: "abort" }));
        reject(new DOMException("Abort", "AbortError"));
      };

      const cleanup = () => {
        if (signal) signal.removeEventListener("abort", abortHandler);
        socket.removeEventListener("message", messageHandler);
        socket.removeEventListener("error", errorHandler);
      };

      if (signal) signal.addEventListener("abort", abortHandler);

      const messageHandler = (event: MessageEvent) => {
        const data = JSON.parse(event.data);

        resolve({
          output: data.output || [],
          error: data.error,
        });

        cleanup();
      };

      const errorHandler = (err: Event) => {
        cleanup();
        reject(err);
      };

      socket.addEventListener("message", messageHandler);
      socket.addEventListener("error", errorHandler);

      socket.send(JSON.stringify({ type: "execute", language, code }));
    });
  }
}
