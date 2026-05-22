import { thermalMonitor } from "../others/thermal";

/**
 * SandboxOrchestrator: O Cérebro da Execução
 * Responsável por:
 * 1. Persistência de Worker (Singleton)
 * 2. Gestão Térmica (Thermal Spikes)
 * 3. Ponte de Streaming (Hot Reload)
 * 4. Isolamento Atômico (AbortSignal)
 */
export class SandboxOrchestrator {
  private activeWorker: Worker | null = null;
  private currentLanguage: string = "";
  private executionId: string = "";

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("visibilitychange", () => this.handleVisibilityChange());
      window.addEventListener("pagehide", () => this.cleanUpMemoryAggressively());
      thermalMonitor.subscribe(() => this.handleTelemetryPulse());
    }
  }

  private handleVisibilityChange() {
    if (document.visibilityState === "hidden") {
      this.cleanUpMemoryAggressively();
    }
  }

  private handleTelemetryPulse() {
    const status = thermalMonitor.getStatus();
    if (status === "THERMAL_CRITICAL") {
      console.warn("[Orchestrator] Alerta Crítico Térmico: Forçando desligamento de Workers.");
      this.cleanUpMemoryAggressively();
    }
  }

  /**
   * Método de Execução Unificado
   * Agora o Orchestrator age como o ponto de entrada único.
   */
  public async execute(
    code: string,
    language: string,
    signal?: AbortSignal,
    onLog?: (chunk: string, type: 'stdout' | 'stderr' | 'meta') => void
  ): Promise<any> {
    const worker = await this.bootLanguageRuntime(language);

    this.executionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return new Promise((resolve, reject) => {
      const handleAbort = () => {
        worker.removeEventListener("message", handleMessage);
        worker.removeEventListener("error", handleError);
        this.cleanUpMemoryAggressively();
        reject(new Error("Execution aborted by user."));
      };

      const handleMessage = (e: MessageEvent) => {
        if (e.data.id === this.executionId) {
          if (e.data.success) {
            onLog?.(JSON.stringify(e.data.output), 'stdout');
            resolve(e.data.output);
          } else {
            onLog?.(e.data.error, 'stderr');
            reject(new Error(e.data.error));
          }
        }
      };

      const handleError = (err: ErrorEvent) => {
        onLog?.(err.message, 'stderr');
        reject(err);
      };

      signal?.addEventListener("abort", handleAbort);

      worker.addEventListener("message", handleMessage);
      worker.addEventListener("error", handleError);

      worker.postMessage({ id: this.executionId, code, language });
    });
  }

  public async bootLanguageRuntime(language: string): Promise<Worker> {
    const normalizedLang = language.toLowerCase();

    // Reutilização de Runtime (Padrão Singleton)
    if (this.activeWorker && this.currentLanguage === normalizedLang) {
      return this.activeWorker;
    }

    // Cooldown térmico
    if (thermalMonitor.getStatus() === "THROTTLED") {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    this.cleanUpMemoryAggressively();
    this.currentLanguage = normalizedLang;

    // Configuração de Runtime (Worker Factory)
    if (["javascript", "typescript", "html"].includes(normalizedLang)) {
      this.activeWorker = this.createLocalWorker();
    } else {
      // Implementação de WASM/Remote será roteada aqui
      throw new Error(`Runtime para ${normalizedLang} ainda requer configuração de roteamento.`);
    }

    return this.activeWorker;
  }

  private createLocalWorker(): Worker {
    const workerCode = `
      self.onmessage = async (e) => {
        const { id, code } = e.data;
        const console = {
          log: (...args) => self.postMessage({ id, success: true, output: args.join(" ") }),
          error: (...args) => self.postMessage({ id, success: false, error: args.join(" ") })
        };
        try {
          const fn = new Function("console", '"use strict";\\n' + code);
          await fn(console);
        } catch (err) {
          self.postMessage({ id, success: false, error: err.message });
        }
      };
    `;
    const blob = new Blob([workerCode], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);
    return new Worker(workerUrl);
  }

  public cleanUpMemoryAggressively() {
    if (this.activeWorker) {
      this.activeWorker.terminate();
      this.activeWorker = null;
    }
    this.currentLanguage = "";
  }
}

export const sandboxOrchestrator = new SandboxOrchestrator();