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
    this.cleanUpMemoryAggressively(); // Garante que a linguagem anterior foi expurgada da RAM

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
      console.log(
        `[Memory Purge] Destruindo Worker da linguagem: ${this.currentLanguage}`,
      );
      this.activeWorker.terminate();
      this.activeWorker = null;
    }

    // Força o Garbage Collector do JavaScript a coletar referências soltas
    this.currentLanguage = "";
  }
}
