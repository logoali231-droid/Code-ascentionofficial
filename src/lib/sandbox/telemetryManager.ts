import { saveTelemetryBatch, TelemetryMetric } from "../others/db";

const BUFFER_SIZE = 50; // Tamanho do Ring Buffer em memória
const SAMPLING_RATE = 0.3; // 30% de amostragem para evitar escrita massiva

export class RingBufferTelemetry {
  static record(arg0: { metric: string; value: number; context: { language: string; executionId?: string; status?: string;      // Adicionar opcionalmente
  [key: string]: any; }; }) {
    throw new Error("Method not implemented.");
  }
  private buffer: TelemetryMetric[] = new Array(BUFFER_SIZE);
  private head = 0;
  private tail = 0;
  private count = 0;
  private isFlushScheduled = false;

  
  /**
   * Adiciona uma métrica ao buffer usando amostragem (Sampling)
   */
  public record(metric: Omit<TelemetryMetric, "timestamp">) {
    // Filtro de amostragem estatística
    if (Math.random() > SAMPLING_RATE) return;

    const fullMetric: TelemetryMetric = {
      ...metric,
      timestamp: Date.now(),
    };

    // Insere no Ring Buffer circular
    this.buffer[this.head] = fullMetric;
    this.head = (this.head + 1) % BUFFER_SIZE;

    if (this.count < BUFFER_SIZE) {
      this.count++;
    } else {
      // Buffer cheio: sobrescreve o dado mais antigo movendo o tail
      this.tail = (this.tail + 1) % BUFFER_SIZE;
    }

    // Se atingir metade da capacidade ou se houver dados pendentes, agenda o flush em background
    if (this.count >= 10 && !this.isFlushScheduled) {
      this.scheduleFlush();
    }
  }

  /**
   * Agenda o esvaziamento aproveitando ciclos ociosos da CPU (requestIdleCallback)
   */
  private scheduleFlush() {
    this.isFlushScheduled = true;

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      window.requestIdleCallback((deadline) => {
        this.flush(deadline);
      });
    } else {
      // Fallback para ambientes sem suporte (Edge cases/Safaris antigos)
      setTimeout(() => this.flush(), 200);
    }
  }

  /**
   * Executa a limpeza do buffer e joga em lote para o IndexedDB
   */
 private async flush(deadline?: IdleDeadline) {
    if (this.count === 0) {
      this.isFlushScheduled = false;
      return;
    }

    const batchToPersist: TelemetryMetric[] = [];

    while (this.count > 0) {
      if (deadline && deadline.timeRemaining() <= 1) {
        this.scheduleFlush();
        break;
      }
      
      const item = this.buffer[this.tail];
      if (item) batchToPersist.push(item);
      
      this.tail = (this.tail + 1) % BUFFER_SIZE;
      this.count--;
    }

    if (batchToPersist.length > 0) {
      try {
        await saveTelemetryBatch(batchToPersist);
      } catch (err) {
        console.error("Falha ao persistir métricas de telemetria:", err);
      }
    }

    if (this.count === 0) {
      this.isFlushScheduled = false;
    }
  }
}

export const telemetry = new RingBufferTelemetry();
