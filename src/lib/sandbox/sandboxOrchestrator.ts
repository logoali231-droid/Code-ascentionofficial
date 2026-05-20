import { thermalMonitor } from "../others/thermal";

/**
 * Core Sandbox Orchestrator - Code Ascension
 * Padrão de Ciclo de Vida Efêmero / Persistente Adaptativo com Escuta Reativa de Telemetria
 */
export class SandboxOrchestrator {
  private activeWorker: Worker | null = null;
  private currentLanguage: string = "";

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("visibilitychange", () => this.handleVisibilityChange());
      window.addEventListener("pagehide", () => this.cleanUpMemoryAggressively());
      
      // 🛠️ ACOPLAMENTO COM TELEMETRIA: Assina o monitor térmico/latência para agir em Background
      thermalMonitor.subscribe(() => this.handleTelemetryPulse());
    }
  }

  private handleVisibilityChange() {
    if (document.visibilityState === "hidden") {
      console.log("[Safari Guard] Aba oculta detectada. Salvando estado e purgando runtimes...");
      this.cleanUpMemoryAggressively();
    }
  }

  /**
   * Resposta imediata a mudanças de telemetria locais
   */
  private handleTelemetryPulse() {
    const status = thermalMonitor.getStatus();
    if (status === "THROTTLED" || status === "THERMAL_CRITICAL") {
      console.warn(`[Orchestrator Hub] Telemetria emitiu alerta (${status}). Desalocando runtimes ociosos preventivamente.`);
      // Se o sistema entrar em colapso térmico, limpa o worker em background imediatamente para poupar RAM/CPU
      this.cleanUpMemoryAggressively();
    }
  }

  public async bootLanguageRuntime(language: string): Promise<Worker> {
    const normalizedLang = language.toLowerCase();

    if (this.activeWorker && this.currentLanguage === normalizedLang) {
      return this.activeWorker;
    }

    const thermalState = thermalMonitor.getStatus();
    
    // 🎚️ Amortecimento Térmico Proativo Dinâmico
    if (thermalState === "THROTTLED") {
      console.warn("[THERMAL] Dispositivo instável. Aplicando cooldown adaptativo de 2s antes do escalonamento...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    } else if (thermalState === "THERMAL_CRITICAL") {
      throw new Error("Compilação local suspensa por segurança de hardware. Chaveando via Smart Routing.");
    }

    this.cleanUpMemoryAggressively();
    this.currentLanguage = normalizedLang;

    if (normalizedLang === "javascript" || normalizedLang === "typescript" || normalizedLang === "html") {
      const workerCode = `
        self.onmessage = async (e) => {
          const { id, code } = e.data;
          const logs = [];
          const console = {
            log: (...args) => logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(" ")),
            error: (...args) => logs.push("[ERROR] " + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(" "))
          };
          try {
            const fn = new Function("console", '"use strict";\\n' + code);
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
        case "python": workerURL = "./pythonWasmWorker.ts"; break;
        case "lua": workerURL = "./luaWasmWorker.ts"; break;
        default: workerURL = "./simulatedEngineWorker.ts";
      }
      this.activeWorker = new Worker(new URL(workerURL, import.meta.url), {
        type: "module",
      });
    }

    return this.activeWorker;
  }

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
        console.log("[Sandbox Guard] Ponteiro limpo da memória.");
      }
    }
    this.currentLanguage = "";
  }
}

export const sandboxOrchestrator = new SandboxOrchestrator();