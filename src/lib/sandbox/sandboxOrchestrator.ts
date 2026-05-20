/**
 * Core Sandbox Orchestrator - Code Ascension
 * Padrão de Ciclo de Vida Efêmero (Inspirado no gerenciamento de RAM do iOS Safari)
 */

export class SandboxOrchestrator {
  private activeWorker: Worker | null = null;
  private currentLanguage: string = "";

  constructor() {
    // Escuta eventos nativos de ciclo de vida da aba do navegador
    if (typeof window !== "undefined") {
      window.addEventListener("visibilitychange", () =>
        this.handleVisibilityChange(),
      );
      window.addEventListener("pagehide", () =>
        this.cleanUpMemoryAggressively(),
      );
    }
  }

  // Se o usuário mudou de aba no Safari, nós liberamos a memória IMEDIATAMENTE
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
      // Não recarrega nada automático aqui. Espera o usuário dar "Play" para poupar bateria e RAM
    }
  }

  /**
   * Inicializa o ambiente da linguagem escolhida sob demanda (Lazy Loading)
   */
  public async bootLanguageRuntime(language: string): Promise<Worker> {
    const { thermalMonitor } = await import("../others/thermal");
    
    // 🔥 Adaptive Throttling: Dá 2 segundos de respiro para a CPU antes de subir novo worker
    if (thermalMonitor.getStatus() === 'THROTTLED') {
      console.warn("[THERMAL] Sistema quente. Aplicando cooldown de 2s...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    this.cleanUpMemoryAggressively();
    this.currentLanguage = language;
    let workerURL = "";

    // Mapeamento dinâmico de scripts dos workers
    switch (language.toLowerCase()) {
      case "python":
        workerURL = "./pythonWasmWorker.ts";
        break;
      case "lua":
        workerURL = "./luaWasmWorker.ts";
        break;
      case "javascript":
      case "typescript":
        workerURL = "./jsIsolatedWorker.ts";
        break;
      default:
        workerURL = "./simulatedEngineWorker.ts"; // Categoria D
    }

    this.activeWorker = new Worker(new URL(workerURL, import.meta.url), {
      type: "module",
    });
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
        } catch (error) {
            console.error("[Sandbox Guard] Erro fatal ao finalizar Worker:", error);
        } finally {
            // SOLUÇÃO: Força o reset atômico do ponteiro para nulo
            this.activeWorker = null; 
            console.log("[Sandbox Guard] Ponteiro limpo. Garbage collector liberado.");
        }
    }
    this.currentLanguage = "";
}
}
