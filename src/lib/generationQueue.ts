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
          console.log("[RuntimeQueue] Contexto oculto. Abortando todas as tarefas ativas...");
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
    customId?: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const controller = new AbortController();
      const task: QueueTask = {
        id: customId || crypto.randomUUID(),
        priority,
        execute,
        controller,
        resolve,
        reject,
      };

      this.queue.push(task);
      // Ordena por prioridade decrescente (maiores primeiro)
      this.queue.sort((a, b) => b.priority - a.priority);

      this.processNext();
    });
  }

  /**
   * Processa as tarefas respeitando o limite estrito de concorrência
   */
  private async processNext() {
    if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift()!;
    this.activeCount++;

    // Se o sinal já foi abortado antes mesmo de iniciar
    if (task.controller.signal.aborted) {
      this.activeCount--;
      task.reject(new DOMException("Aborted", "AbortError"));
      this.processNext();
      return;
    }

    try {
      const result = await task.execute(task.controller.signal);
      task.resolve(result);
    } catch (error) {
      task.reject(error);
    } {
      this.activeCount--;
      this.processNext();
    }
  }

  /**
   * Aborta uma tarefa específica pelo ID
   */
  public abortTask(id: string) {
    const activeTask = this.queue.find(t => t.id === id);
    if (activeTask) {
      activeTask.controller.abort();
    }
  }

  /**
   * Aborta e limpa absolutamente tudo em execução ou espera
   */
  public abortAll() {
    // Aborda e esvazia a fila de espera
    this.queue.forEach(task => {
      task.controller.abort();
      task.reject(new DOMException("Context switched or context closed.", "AbortError"));
    });
    this.queue = [];
    this.activeCount = 0;
  }
}

// Instância global única para o runtime da aplicação
export const runtimeQueue = new RuntimeQueue(2);