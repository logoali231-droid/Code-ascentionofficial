import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

let handler: WebWorkerMLCEngineHandler | null = null;

function createHandler() {
  if (!handler) {
    handler = new WebWorkerMLCEngineHandler();
  }

  return handler;
}
self.onmessage = async (msg: MessageEvent) => {
  try {
    const { type } = msg.data;
if (type === "ABORT" || type === "unload") {

  try {

    // remove referência do handler
    handler = null;

    self.postMessage({
      type: "ABORTED_SUCCESS",
    });

  } catch (err) {

    console.warn("[WORKER UNLOAD ERROR]", err);

  } finally {

    // 🔥 mata o worker completamente
    self.close();
  }

  return;
}
    const currentHandler = createHandler();

    await currentHandler.onmessage(msg);

  } catch (err) {

    const errorMessage =
      err instanceof Error
        ? err.message
        : String(err);

    self.postMessage({
      type: "worker_error",
      error: errorMessage,
    });
  }
};
