import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

let handler: WebWorkerMLCEngineHandler | null = null;

try {
  handler = new WebWorkerMLCEngineHandler();

  self.onmessage = async (msg: MessageEvent) => {
    const { type } = msg.data;

    if (type === "unload" || type === "ABORT") {
      console.log(
        "[WebLLM Worker] Interrupção ativa detectada. Liberando buffers de GPU...",
      );

      try {
        if (handler) {
          await handler.onmessage({
            data: { type: "unload" },
          } as MessageEvent);
        }
      } catch (cleanErr) {
        console.error(
          "[WebLLM Worker] Erro ao descarregar motor:",
          cleanErr,
        );
      } finally {
        handler = null;

        setTimeout(() => {
          handler =
            new WebWorkerMLCEngineHandler();
        }, 0);
      }

      self.postMessage({
        type: "ABORTED_SUCCESS",
      });

      return;
    }

    try {
      await handler?.onmessage(msg);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : String(err);

      console.error(
        "[WebLLM Worker Error]",
        errorMessage,
      );

      self.postMessage({
        type: "worker_error",
        error: errorMessage,
      });
    }
  };
} catch (e) {
  console.error(
    "[WebLLM Worker Fatal]",
    e,
  );

  self.postMessage({
    type: "worker_fatal",
    error: "Erro no Kernel de IA",
  });
}