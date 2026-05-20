"use client";

import { ExecutionResult, IEngineExecutor } from "./engines";
import { sandboxOrchestrator } from "./sandboxOrchestrator";

// Alteração sugerida no LocalExecutor.ts
export class LocalExecutor implements IEngineExecutor {
  // Adicionamos um callback opcional para streaming
  async execute(
    code: string,
    language: string,
    signal?: AbortSignal,
    onOutput?: (chunk: string) => void 
  ): Promise<ExecutionResult> {
    if (signal?.aborted) {
      return {
        output: [],
        error: "Execution aborted by caller.",
      };
    }
    return new Promise(async (resolve) => {
      let worker: Worker;
      // ID Único de execução para correlacionar mensagens e evitar vazamento/colisão de buffers
      const executionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      try {
        // Consome a thread persistente gerenciada centralizadamente pelo Orquestrador
        worker = await sandboxOrchestrator.bootLanguageRuntime(language);
      } catch (err: any) {
        return resolve({
          output: [],
          error: `Failed to initialize shared runtime sandbox: ${err.message}`,
        });
      }

      let handleMessage: (e: MessageEvent) => void;
      let handleError: (err: ErrorEvent) => void;
      let handleAbort: () => void;

      // Limpeza estrita apenas de listeners locais para manter o Worker persistente intacto
      const removeListeners = () => {
        if (worker) {
          worker.removeEventListener("message", handleMessage);
          worker.removeEventListener("error", handleError);
        }
        if (signal) {
          signal.removeEventListener("abort", handleAbort);
        }
      };

      // Se der Abort/Timeout, o Worker pode estar preso em loop infinito. Forçamos a destruição física.
      handleAbort = () => {
        removeListeners();
        sandboxOrchestrator.cleanUpMemoryAggressively();
        resolve({
          output: [],
          error: "Execution Timeout / Process Aborted.",
        });
      };

     handleMessage = (e: MessageEvent) => {
      if (e.data.type === "stdout" || e.data.type === "stderr") {
        onOutput?.(e.data.content); // Envia o pedaço imediatamente
      }
      
      if (e.data.id === executionId && e.data.type === "finish") {
        removeListeners();
        resolve({ output: e.data.output, metrics: { engine: "local" } });
      }
    };

      handleError = (err: ErrorEvent) => {
        removeListeners();
        sandboxOrchestrator.cleanUpMemoryAggressively();
        resolve({
          output: [],
          error: err.message,
        });
      };

      if (signal) {
        signal.addEventListener("abort", handleAbort);
      }

      worker.addEventListener("message", handleMessage);
      worker.addEventListener("error", handleError);
      worker.postMessage({ id: executionId, code, language });
    });
  }
}