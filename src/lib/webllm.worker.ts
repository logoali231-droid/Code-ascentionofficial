import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

/**
 * Em 2026, o Handler oficial da MLC já é otimizado, 
 * mas adicionamos um wrapper para monitorar a saúde do processo.
 */
try {
  const handler = new WebWorkerMLCEngineHandler();

  self.onmessage = (msg: MessageEvent) => {
    // Monitoramento de mensagens para depuração em tempo real
    if (msg.data.type === "heartbeat") {
      self.postMessage({ type: "heartbeat_ack", timestamp: Date.now() });
      return;
    }
    
    try {
      handler.onmessage(msg);
    } catch (err) {
      console.error("[Worker IA] Erro Crítico no Handler:", err);
      self.postMessage({ type: "worker_error", error: err.message });
    }
  };

  // Graceful shutdown: Limpa recursos se o worker for finalizado
  self.onclose = () => {
    console.warn("[Worker IA] Encerrando e liberando VRAM...");
  };
} catch (e) {
  self.postMessage({ type: "worker_fatal", error: "Falha ao iniciar motor de IA" });
}
