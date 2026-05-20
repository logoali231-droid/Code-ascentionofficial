// src/lib/sandbox/engines/LocalExecutor.ts
import { IEngineExecutor, SandboxResult } from "./types";
import { LocalWorkerManager, runLocal } from "./sandboxRunner"; // Ajuste o path conforme sua estrutura

export class LocalExecutor implements IEngineExecutor {
  async execute(code: string, language: string, signal?: AbortSignal): Promise<SandboxResult> {
    // Delega a execução para a sua função runLocal que já possui a fila e a telemetria
    const result = await runLocal(code, language, signal);
    
    return {
      output: result.output,
      error: result.error,
      metrics: {
        // Você pode expandir isso futuramente para incluir métricas do worker
        execTime: 0, 
      }
    };
  }
}


/**
 * Fila de Execução com Telemetria (Mutex)
 */
export class ExecutionQueue {
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
