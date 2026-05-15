import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

let handler: WebWorkerMLCEngineHandler | null = null;

try {
  handler = new WebWorkerMLCEngineHandler();

  self.onmessage = (msg: MessageEvent) => {
    // Intercetar comando de descarga para limpar VRAM agressivamente
    if (msg.data.type === "unload") {
       console.log("[Worker] A limpar recursos de GPU...");
       // Força a limpeza se o handler permitir ou mata a instância
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
