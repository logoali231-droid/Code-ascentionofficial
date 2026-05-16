import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

let handler: WebWorkerMLCEngineHandler | null = null;

try {
  handler = new WebWorkerMLCEngineHandler();

  self.onmessage = async (msg: MessageEvent) => {
    const { type } = msg.data;

    // INTERCEPÇÃO DE ABORTO / DESCARGA: Limpeza agressiva de VRAM
    if (type === "unload" || type === "ABORT") {
      console.log("[WebLLM Worker] Interrupção ativa detectada. Liberando buffers de GPU...");
      try {
        if (handler) {
          // Solicita o descarregamento interno do modelo no MLC-AI se houver motor ativo
          await handler.onmessage({ data: { type: "unload" } } as MessageEvent);
        }
      } catch (cleanErr) {
        console.error("[WebLLM Worker] Erro ao descarregar motor de inferência:", cleanErr);
      } finally {
        handler = null;
        // Força a reinicialização limpa do Handler no próximo ciclo se necessário
        handler = new WebWorkerMLCEngineHandler();
      }
      
      // Notifica o sistema de que o cancelamento foi concluído na thread
      self.postMessage({ type: "ABORTED_SUCCESS" });
      return;
    }

    try {
      handler?.onmessage(msg);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      self.postMessage({ type: "worker_error", error: errorMessage });
    }
  };
} catch (e) {
  self.postMessage({ type: "worker_fatal", error: "Erro no Kernel de IA" });
}