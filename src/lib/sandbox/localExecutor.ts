"use client";

import { SYSTEM_CONFIG } from "@/config/system";

/**
 * Gerenciador de Ciclo de Vida do Worker (Singleton)
 * Mantém o worker ativo para evitar overhead de criação (GC Pressure)
 */
export class LocalWorkerManager {
  private static worker: Worker | null = null;
  private static workerUrl: string | null = null;

  public static get(): Worker {
    if (!this.worker) {
      const workerCode = `
        self.onmessage = function(e) {
          const logs = [];
          const customConsole = {
            log: (...args) => logs.push(args.map(arg => typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)).join(" ")),
            error: (...args) => logs.push("[ERROR] " + args.join(" "))
          };
          try {
            const run = new Function("console", '"use strict"; ' + e.data.code);
            run(customConsole);
            self.postMessage({ success: true, output: logs });
          } catch (err) {
            self.postMessage({ success: false, error: err.message });
          }
        };
      `;
      const blob = new Blob([workerCode], { type: "application/javascript" });
      this.workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(this.workerUrl);
    }
    return this.worker;
  }

  public static terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      if (this.workerUrl) {
        URL.revokeObjectURL(this.workerUrl);
        this.workerUrl = null;
      }
    }
  }
}

/**
 * Fila de Execução com Telemetria (Mutex)
 */
class ExecutionQueue {
  private static chain: Promise<any> = Promise.resolve();

  public static enqueue<T>(task: () => Promise<T>, taskName: string): Promise<T> {
    const queuedAt = performance.now();

    const wrapper = async () => {
      const startedAt = performance.now();
      const waitTime = startedAt - queuedAt;

      try {
        const result = await task();
        const finishedAt = performance.now();
        const execTime = finishedAt - startedAt;

        console.debug(`[RUNTIME: ${taskName}] Wait: ${waitTime.toFixed(2)}ms | Exec: ${execTime.toFixed(2)}ms`);
        return result;
      } catch (error) {
        console.error(`[RUNTIME: ${taskName}] Failed after ${performance.now() - startedAt}ms`);
        throw error;
      }
    };

    this.chain = this.chain.then(wrapper);
    return this.chain as any;
  }
}

export async function runLocal(
  code: string,
  lang: string,
  signal?: AbortSignal,
): Promise<{ output: string[]; error?: string }> {
  
  const targetLang = lang.toLowerCase() as keyof typeof SYSTEM_CONFIG.LIMITS.LANGUAGES;
  const timeoutLimit = SYSTEM_CONFIG.LIMITS.timeout || 4000;

  return ExecutionQueue.enqueue(async () => {
    
    // 1. Verificação prévia de Abort
    if (signal?.aborted) {
      return { output: [], error: "Execution aborted by system." };
    }

    return new Promise((resolve) => {
      const worker = LocalWorkerManager.get();
      
      // Cleanup para evitar listeners vazando
      const cleanup = () => {
        clearTimeout(timeoutId);
        if (signal) signal.removeEventListener("abort", abortHandler);
        worker.onmessage = null;
        worker.onerror = null;
      };

      const abortHandler = () => {
        cleanup();
        LocalWorkerManager.terminate(); // Force kill on abort to ensure clean state
        resolve({ output: [], error: "Execution intercepted and terminated." });
      };

      if (signal) signal.addEventListener("abort", abortHandler);

      const timeoutId = setTimeout(() => {
        cleanup();
        LocalWorkerManager.terminate(); // Kill no timeout
        resolve({ output: [], error: `Execution timeout exceeded (${timeoutLimit}ms).` });
      }, timeoutLimit);

      worker.onmessage = (e) => {
        cleanup();
        if (e.data.success) resolve({ output: e.data.output });
        else resolve({ output: [], error: e.data.error });
      };

      worker.onerror = (err) => {
        cleanup();
        LocalWorkerManager.terminate(); // Erro fatal no worker, reinicia na próxima
        resolve({ output: [], error: err instanceof Error ? err.message : "Unknown Worker Error" });
      };

      worker.postMessage({ code });
    });
  }, `LocalExec-${lang}`);
}
