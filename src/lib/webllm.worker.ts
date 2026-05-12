import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

try {
  const handler = new WebWorkerMLCEngineHandler();

  self.onmessage = (msg: MessageEvent) => {
    if (msg.data.type === "heartbeat") {
      self.postMessage({ type: "heartbeat_ack", timestamp: Date.now() });
      return;
    }
    
    try {
      handler.onmessage(msg);
    } catch (err) {
      console.error("[Worker IA] Erro Crítico no Handler:", err);
      // CORREÇÃO: Validação de tipo para o TS/Vercel
      const errorMessage = err instanceof Error ? err.message : String(err);
      self.postMessage({ type: "worker_error", error: errorMessage });
    }
  };

  self.onclose = () => {
    console.warn("[Worker IA] Encerrando e liberando VRAM...");
  };
} catch (e) {
  const fatalError = e instanceof Error ? e.message : "Falha ao iniciar motor de IA";
  self.postMessage({ type: "worker_fatal", error: fatalError });
}
