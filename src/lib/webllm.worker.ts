import { WebWorkerMLCEngineHandler } from "@mlc-ai/web-llm";

// Este handler escuta as mensagens da thread principal e gerencia a IA isoladamente
const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
