/**
 * CODE-ASCENSION: SISTEMA DE TELEMETRIA E BARRAMENTO DE EVENTOS NEURAIS
 * Otimizado para execução leve e prevenção de loops infinitos.
 */

// 1. Enums Hierárquicos com Notação de Ponto
export enum EventType {
  // Eventos de Exercício
  EXERCISE_SUBMITTED = "exercise.submitted",
  EXERCISE_PASSED = "exercise.passed",
  EXERCISE_FAILED = "exercise.failed",

  // Eventos de Runtime e Workers
  RUNTIME_START = "runtime.start",
  RUNTIME_TIMEOUT = "runtime.timeout",
  RUNTIME_ERROR = "runtime.error",
  RUNTIME_SUCCESS = "runtime.success",

  // Eventos da IA Local
  AI_ANALYSIS_START = "ai.analysis_start",
  AI_ANALYSIS_READY = "ai.analysis_ready",
  AI_ERROR = "ai.error",

  // Eventos de Economia e Transações
  SHOP_PURCHASE_TRY = "shop.purchase_try",
  SHOP_PURCHASE_SUCCESS = "shop.purchase_success",
  SHOP_PURCHASE_FAILED = "shop.purchase_failed",
}

// 2. Assinatura de Payload Unificada e Estrita
export interface AppEvent<T = any> {
  type: EventType;
  source: string; // Ex: "evaluator.ts", "logic.worker.ts", "SandboxEditor"
  traceId: string; // UUID herdado ou gerado na ação inicial
  payload: T;
  timestamp: number;
}

type EventCallback<T = any> = (event: AppEvent<T>) => void | Promise<void>;

class EventBus {
  private listeners: Map<EventType, Set<EventCallback>> = new Map();

  // Histórico recente de traceIds processados para evitar loops infinitos (Graph Cyclic Guard)
  private processedTraces: Set<string> = new Set();
  private maxTraceHistory = 100;

  constructor() {
    // Limpeza periódica do cache de traces para evitar vazamento de memória no M23
    if (typeof window !== "undefined") {
      setInterval(() => this.processedTraces.clear(), 60000); // Limpa a cada 1 minuto
    }
  }

  /**
   * Inscreve um listener em um canal de evento específico
   */
  public on<T = any>(type: EventType, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    // Retorna uma função de unsubscribe limpa
    return () => {
      const targets = this.listeners.get(type);
      if (targets) {
        targets.delete(callback);
        if (targets.size === 0) this.listeners.delete(type);
      }
    };
  }

  /**
   * Emite um evento de forma assíncrona desacoplada para não travar a Main Thread
   */
  public emit<T = any>(event: Omit<AppEvent<T>, "timestamp">): void {
    const fullEvent: AppEvent<T> = {
      ...event,
      timestamp: Date.now(),
    };

    // Mecanismo Antiloop: Se o mesmo traceID disparar o mesmo evento em cadeia rápida, corta a propagação
    const loopKey = `${fullEvent.traceId}:${fullEvent.type}`;
    if (this.processedTraces.has(loopKey)) {
      console.warn(
        `[EventBus] Loop infinito evitado para o TraceId: ${fullEvent.traceId} no evento ${fullEvent.type}`,
      );
      return;
    }

    // Registra o trace executado
    this.processedTraces.add(loopKey);
    if (this.processedTraces.size > this.maxTraceHistory) {
      // Remove o primeiro elemento inserido para manter o limite de memória fixo
      const firstKey = this.processedTraces.values().next().value;
      if (firstKey) this.processedTraces.delete(firstKey);
    }

    // Execução assíncrona segura (Desacoplamento por microtask)
    Promise.resolve().then(async () => {
      const targets = this.listeners.get(fullEvent.type);
      if (!targets) return;

      for (const listener of targets) {
        try {
          await listener(fullEvent);
        } catch (error) {
          console.error(
            `[EventBus] Erro ao processar listener de ${fullEvent.type}:`,
            error,
          );
        }
      }
    });
  }

  /**
   * Helper utilitário para gerar Trace IDs válidos caso a ação esteja iniciando do zero
   */
  public generateTraceId(): string {
    return typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }
}

// Exporta instância única global (Singleton)
export const eventBus = new EventBus();
