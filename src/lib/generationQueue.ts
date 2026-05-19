"use client";

/* =========================================================
   CODE ASCENT - RUNTIME QUEUE (ENXUTA)
   PURPOSE: Multi-concurrency, Direct Priority & Active Abort
========================================================= */

export interface QueueTask {
  id: string;
  priority: number; // Maior número = Maior prioridade
  execute: (signal: AbortSignal) => Promise<any>;
  controller: AbortController;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  queuedAt: number;
}

class RuntimeQueue {
  private queue: QueueTask[] = [];
  private activeCount = 0;
  private maxConcurrency: number;

  constructor(maxConcurrency = 2) {
    this.maxConcurrency = maxConcurrency;

    // Vínculo global com o ciclo de vida do navegador (Troca de aba / Fechar contexto)
    if (typeof window !== "undefined") {
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          console.log(
            "[RuntimeQueue] Contexto oculto. Abortando todas as tarefas ativas...",
          );
          this.abortAll();
        }
      });
    }
  }

  /**
   * Enfileira uma nova tarefa com prioridade direta e AbortController nativo
   */
  public enqueue<T>(
    execute: (signal: AbortSignal) => Promise<T>,
    priority = 0,
    customId?: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const controller = new AbortController();
      const task = this.queue.shift()!;
    
    // Cálculo do Wait Time (tempo na fila)
    const waitTime = performance.now() - task.queuedAt;
    
    this.activeCount++;

    // Se o sinal já foi abortado antes mesmo de iniciar
    if (task.controller.signal.aborted) {
      this.activeCount--;
      task.reject(new DOMException("Aborted", "AbortError"));
      this.processNext();
      return;
    }

    const execStart = performance.now(); // Início da execução real
    try {
      const result = await task.execute(task.controller.signal);
      const execTime = performance.now() - execStart; // Fim da execução
      
      console.log(`[Telemetry] Task: ${task.id} | Wait: ${waitTime.toFixed(2)}ms | Exec: ${execTime.toFixed(2)}ms`);
      
      task.resolve(result);
    } catch (error) {
      const execTime = performance.now() - execStart;
      console.error(`[Telemetry] Task: ${task.id} (FAILED) | Wait: ${waitTime.toFixed(2)}ms | Exec: ${execTime.toFixed(2)}ms`);
      
      task.reject(error);
    } finally {
      this.activeCount--;
      this.processNext();
    }
  /**
   * Processa as tarefas respeitando o limite estrito de concorrência
   */
  private async processNext() {
    if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift()!;
    
    // Cálculo do Wait Time (tempo na fila)
    const waitTime = performance.now() - task.queuedAt;
    
    this.activeCount++;

    // Se o sinal já foi abortado antes mesmo de iniciar
    if (task.controller.signal.aborted) {
      this.activeCount--;
      task.reject(new DOMException("Aborted", "AbortError"));
      this.processNext();
      return;
    }

    const execStart = performance.now(); // Início da execução real
    try {
      const result = await task.execute(task.controller.signal);
      const execTime = performance.now() - execStart; // Fim da execução
      
      console.log(`[Telemetry] Task: ${task.id} | Wait: ${waitTime.toFixed(2)}ms | Exec: ${execTime.toFixed(2)}ms`);
      
      task.resolve(result);
    } catch (error) {
      const execTime = performance.now() - execStart;
      console.error(`[Telemetry] Task: ${task.id} (FAILED) | Wait: ${waitTime.toFixed(2)}ms | Exec: ${execTime.toFixed(2)}ms`);
      
      task.reject(error);
    } finally {
      this.activeCount--;
      this.processNext();
    }

  /**
   * Aborta uma tarefa específica pelo ID
   */
  public abortTask(id: string) {
    const activeTask = this.queue.find((t) => t.id === id);
    if (activeTask) {
      activeTask.controller.abort();
    }
  }

  /**
   * Aborta e limpa absolutamente tudo em execução ou espera
   */
  public abortAll() {
    // Aborda e esvazia a fila de espera
    this.queue.forEach((task) => {
      task.controller.abort();
      task.reject(
        new DOMException("Context switched or context closed.", "AbortError"),
      );
    });
    this.queue = [];
    this.activeCount = 0;
  }
}

// Instância global única para o runtime da aplicação
export const runtimeQueue = new RuntimeQueue(2);
