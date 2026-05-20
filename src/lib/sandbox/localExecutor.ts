"use client";

import { ExecutionResult, IEngineExecutor } from "./engines";
import { sandboxOrchestrator } from "./sandboxOrchestrator";
import { RingBufferTelemetry } from "./telemetryManager";

export class LocalExecutor implements IEngineExecutor {
  async execute(
    code: string,
    language: string,
    signal?: AbortSignal,
    onLog?: (chunk: string, type: 'stdout' | 'stderr' | 'meta') => void
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    let firstTokenReceived = false;

    if (signal?.aborted) {
      return { output: [], error: "Execution aborted by caller." };
    }

    return new Promise(async (resolve) => {
      const executionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      let worker: Worker;

      try {
        worker = await sandboxOrchestrator.bootLanguageRuntime(language);
      } catch (err: any) {
        return resolve({ output: [], error: `Failed to initialize runtime: ${err.message}` });
      }

      let handleMessage: (e: MessageEvent) => void;
      let handleError: (err: ErrorEvent) => void;
      let handleAbort: () => void;

      const removeListeners = () => {
        if (worker) {
          worker.removeEventListener("message", handleMessage);
          worker.removeEventListener("error", handleError);
        }
        if (signal) signal.removeEventListener("abort", handleAbort);
      };

      handleAbort = () => {
        removeListeners();
        sandboxOrchestrator.cleanUpMemoryAggressively();
        resolve({ output: [], error: "Execution Timeout / Process Aborted." });
      };

      handleMessage = (e: MessageEvent) => {
        const { type, content, output, id } = e.data;

        // Medição de TTFT (Time to First Token)
        if (!firstTokenReceived && (type === "stdout" || type === "stderr")) {
          firstTokenReceived = true;
          RingBufferTelemetry.record({
            metric: "TTFT",
            value: Date.now() - startTime,
            context: { language, executionId }
          });
        }

        // Streaming para a UI (Hot Reload)
        if (type === "stdout" || type === "stderr") {
          onLog?.(content, type);
        }

        if (id === executionId && type === "finish") {
          removeListeners();
          RingBufferTelemetry.record({
            metric: "ExecutionLatency",
            value: Date.now() - startTime,
            context: { language, status: "success" }
            
          });
          resolve({ output, metrics: { engine: "local", executionTime: Date.now() - startTime } });
        }
      };

      handleError = (err: ErrorEvent) => {
        removeListeners();
        sandboxOrchestrator.cleanUpMemoryAggressively();
        resolve({ output: [], error: err.message });
      };

      if (signal) signal.addEventListener("abort", handleAbort);
      worker.addEventListener("message", handleMessage);
      worker.addEventListener("error", handleError);
      
      worker.postMessage({ id: executionId, code, language });
    });
  }
}