/**
 * Core Sandbox Orchestrator - Code Ascension
 * Padrão de Ciclo de Vida Efêmero / Persistente Adaptativo
 */

export class SandboxOrchestrator {
  private activeWorker: Worker | null = null;
  private currentLanguage: string = "";

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("visibilitychange", () =>
        this.handleVisibilityChange(),
      );
      window.addEventListener("pagehide", () =>
        this.cleanUpMemoryAggressively(),
      );
    }
  }

  private handleVisibilityChange() {
    if (document.visibilityState === "hidden") {
      console.log(
        "[Safari Guard] Aba oculta detectada. Salvando estado e purgando runtimes...",
      );
      this.cleanUpMemoryAggressively();
    } else {
      console.log(
        "[Safari Guard] Aba reativada. Pronto para reidratar os motores sob demanda.",
      );
    }
  }

  /**
   * Inicializa ou reaproveita o ambiente da linguagem escolhida sob demanda (Lazy Loading + Cache)
   */
  public async bootLanguageRuntime(language: string): Promise<Worker> {
    const normalizedLang = language.toLowerCase();

    // 🎯 REUTILIZAÇÃO HISTÓRICA: Se o Worker já está de pé para a mesma linguagem, devolve o singleton
    if (this.activeWorker && this.currentLanguage === normalizedLang) {
      return this.activeWorker;
    }

    const { thermalMonitor } = await import("../others/thermal");
    
    // 🔥 Adaptive Throttling: Dá 2 segundos de respiro para a CPU antes de subir novo worker
    if (thermalMonitor.getStatus() === 'THROTTLED') {
      console.warn("[THERMAL] Sistema quente. Aplicando cooldown de 2s...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Se mudou de linguagem ou o worker foi morto, limpa as referências antigas antes de recriar
    this.cleanUpMemoryAggressively();
    this.currentLanguage = normalizedLang;

    if (normalizedLang === "javascript" || normalizedLang === "typescript" || normalizedLang === "html") {
      // Worker embutido persistente estruturado para receber múltiplas mensagens sequenciais
      const workerCode = `
        self.onmessage = async (e) => {
          const { id, code } = e.data;
          const logs = [];
          const console = {
            log: (...args) => logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(" ")),
            error: (...args) => logs.push("[ERROR] " + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(" "))
          };

          try {
            const fn = new Function(
              "console",
              '"use strict";\\n' + code
            );
            await fn(console);
            self.postMessage({ id, success: true, output: logs });
          } catch (err) {
            self.postMessage({ id, success: false, error: err.message });
          }
        };
      `;
      const blob = new Blob([workerCode], { type: "application/javascript" });
      const workerUrl = URL.createObjectURL(blob);
      this.activeWorker = new Worker(workerUrl);
      (this.activeWorker as any)._blobUrl = workerUrl;
    } else {
      let workerURL = "";
      switch (normalizedLang) {
        case "python":
          workerURL = "./pythonWasmWorker.ts";
          break;
        case "lua":
          workerURL = "./luaWasmWorker.ts";
          break;
        default:
          workerURL = "./simulatedEngineWorker.ts";
      }
      this.activeWorker = new Worker(new URL(workerURL, import.meta.url), {
        type: "module",
      });
    }

    return this.activeWorker;
  }

  /**
   * Puxa o disjuntor de RAM (O segredo para o Safari não derrubar o seu PWA)
   */
  public cleanUpMemoryAggressively() {
    if (this.activeWorker) {
      try {
        console.log("[Safari Guard / Sandbox] Interrompendo execução e purgando Worker...");
        this.activeWorker.terminate();
        if ((this.activeWorker as any)._blobUrl) {
          URL.revokeObjectURL((this.activeWorker as any)._blobUrl);
        }
      } catch (error) {
        console.error("[Sandbox Guard] Erro fatal ao finalizar Worker:", error);
      } finally {
        this.activeWorker = null; 
        console.log("[Sandbox Guard] Ponteiro limpo. Garbage collector liberado.");
      }
    }
    this.currentLanguage = "";
  }
}

export const sandboxOrchestrator = new SandboxOrchestrator();