"use client";

import { SYSTEM_CONFIG } from "@/config/system";

export async function runLocal(
  code: string,
  lang: string,
  signal?: AbortSignal, // <-- Injeção do AbortSignal vindo da Runtime Queue
): Promise<{ output: string[]; error?: string }> {
  // Se a fila já cancelou antes de começar
  if (signal?.aborted) {
    return { output: [], error: "Execution aborted by system runtime." };
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

    const blob = new Blob([workerCode], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    // Handler de cancelamento ativo acionado pela troca de abas/contexto
    const abortHandler = () => {
      // ==== ADICIONE ESTA LINHA AQUI ====
      worker.postMessage({ type: "ABORT" }); // Avisa o Worker interno para aplicar os checkpoints de parada
      // ==================================

      cleanup(); // O cleanup vai chamar o worker.terminate() logo em seguida
      resolve({
        output: [],
        error:
          "Execution intercepted and terminated actively (Context switched).",
      });
    };

    if (signal) {
      signal.addEventListener("abort", abortHandler);
    }

    // Limpeza de recursos
    const cleanup = () => {
      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener("abort", abortHandler);
      }
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
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
