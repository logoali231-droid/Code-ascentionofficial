"use client";

import { SYSTEM_CONFIG } from "@/config/system";

// Gerenciador de Ciclo de Vida local
class LocalWorkerManager {
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


class ExecutionQueue {
  private static chain: Promise<any> = Promise.resolve();

  public static enqueue<T>(task: () => Promise<T>): Promise<T> {
    const wrapper = async () => {
      try {
        return await task();
      } catch (error) {
        // Log ou tratamento de erro global aqui, se necessário
        console.error("Queue execution error:", error);
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
  
  // Encapsulamos toda a execução lógica dentro da Fila
  return ExecutionQueue.enqueue(async () => {
    
    // 1. Verificação de abort ANTES de iniciar o processamento do Worker
    if (signal?.aborted) {
      return { output: [], error: "Execution aborted by system runtime." };
    }

    const targetLang = lang.toLowerCase() as keyof typeof SYSTEM_CONFIG.LIMITS.LANGUAGES;
    const memoryLimit = SYSTEM_CONFIG.LIMITS.LANGUAGES[targetLang] || SYSTEM_CONFIG.LIMITS.memory_light;
    const timeoutLimit = SYSTEM_CONFIG.LIMITS.timeout || 4000;

    return new Promise((resolve) => {
      const worker = LocalWorkerManager.get();
      
      const abortHandler = () => {
        // Se abortado, terminamos o worker para garantir limpeza total
        LocalWorkerManager.terminate();
        cleanup();
        resolve({ output: [], error: "Execution intercepted and terminated." });
      };

      if (signal) signal.addEventListener("abort", abortHandler);

      const cleanup = () => {
        clearTimeout(timeoutId);
        if (signal) signal.removeEventListener("abort", abortHandler);
      };

      worker.onmessage = (e) => {
        cleanup();
        if (e.data.success) resolve({ output: e.data.output });
        else resolve({ output: [], error: e.data.error });
      };

      worker.onerror = (err) => {
        cleanup();
        resolve({ output: [], error: err.message });
      };

      const timeoutId = setTimeout(() => {
        cleanup();
        LocalWorkerManager.terminate(); // Timeout mata o worker forçadamente
        resolve({ output: [], error: `Execution timeout exceeded (${timeoutLimit}ms).` });
      }, timeoutLimit);

      worker.postMessage({ code });
    });
  });
}

  const targetLang =
    lang.toLowerCase() as keyof typeof SYSTEM_CONFIG.LIMITS.LANGUAGES;
  const memoryLimit =
    SYSTEM_CONFIG.LIMITS.LANGUAGES[targetLang] ||
    SYSTEM_CONFIG.LIMITS.memory_light;
  const timeoutLimit = SYSTEM_CONFIG.LIMITS.timeout || 4000;

  console.log(
    `[Runtime Sandbox] Inicializando Worker Isolado: Lang: ${lang} | AllocMem: ${memoryLimit} | Timeout: ${timeoutLimit}ms`,
  );

  return new Promise((resolve) => {
    // Criamos um Blob contendo o código de execução isolado em uma Thread separada (Web Worker)
    // Isso impede que códigos maliciosos ou loops infinitos travem a UI do Code-Ascension
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

    // Usamos o Gerenciador em vez de instanciar direto
    const worker = LocalWorkerManager.get();

    // Handler de cancelamento ativo
    const abortHandler = () => {
      // O manager agora controla o ciclo de vida
      LocalWorkerManager.terminate(); 
      
      cleanup(); 
      resolve({
        output: [],
        error: "Execution intercepted and terminated actively (Context switched).",
      });
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener("abort", abortHandler);
      }
      // Não chamamos worker.terminate() aqui para não matar o singleton prematuramente
      // Apenas garantimos que o processo terminou e removemos o listener do AbortSignal
    };

    // Resposta do Worker
    worker.onmessage = (e) => {
      if (e.data.success) {
        resolve({ output: e.data.output });
      } else {
        resolve({ output: [], error: e.data.error });
      }
      cleanup();
    };

    worker.onerror = (err) => {
      resolve({ output: [], error: err.message });
      cleanup();
    };

    // Proteção de Timeout Baseado na Configuração do Sistema
    const timeoutId = setTimeout(() => {
      resolve({
        output: [],
        error: `Execution timeout exceeded (${timeoutLimit}ms).`,
      });
      cleanup();
    }, timeoutLimit);

    // Dispara a execução mandando o código do estudante para dentro do Worker
    worker.postMessage({ code });
  });
}
