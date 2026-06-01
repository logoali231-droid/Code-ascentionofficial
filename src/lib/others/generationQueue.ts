import { SYSTEM_CONFIG } from "@/config/system";

export interface QueueTask {
  id: string;
  priority: number;
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
    if (typeof window !== "undefined") {
      document.addEventListener(
        "visibilitychange",
        () => {
          if (
            document.hidden &&
            !/Android/i.test(
              navigator.userAgent
            )
          ) {
            this.abortAll();
          }
        }
      );
    }
  }

  public enqueue<T>(
    execute: (signal: AbortSignal) => Promise<T>,
    priority = 0,
    customId?: string,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const controller = new AbortController();
      const task: QueueTask = {
        id: customId || Math.random().toString(36),
        priority,
        execute,
        controller,
        resolve,
        reject,
        queuedAt: performance.now(),
      };

      this.queue.push(task);
      // Ordena por prioridade se necessário
      this.queue.sort((a, b) => b.priority - a.priority);
      this.processNext();
    });
  }

  private async processNext() {
    if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const task = this.queue.shift()!;
    const waitTime = performance.now() - task.queuedAt;
    this.activeCount++;

    if (task.controller.signal.aborted) {
      this.activeCount--;
      task.reject(new DOMException("Aborted", "AbortError"));
      this.processNext();
      return;
    }

    const execStart = performance.now();
    try {
      const result = await task.execute(task.controller.signal);
      const execTime = performance.now() - execStart;
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
  }

  public abortTask(id: string) {
    const activeTask = this.queue.find((t) => t.id === id);
    if (activeTask) activeTask.controller.abort();
  }

  public abortAll() {
    this.queue.forEach((task) => {
      task.controller.abort();

      task.reject(
        new DOMException(
          "Context switched.",
          "AbortError",
        ),
      );
    });

    this.queue = [];

    // NÃO resetar activeCount brutalmente
    // deixa finalizar naturalmente
  }
}

export const runtimeQueue =
  new RuntimeQueue(
    SYSTEM_CONFIG.QUEUE.maxConcurrent,
  );

