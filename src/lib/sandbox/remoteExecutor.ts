"use client";

import { connectSandboxSocket } from "./sandboxSocket";

export async function runRemote(
  code: string,
  language: string,
  signal?: AbortSignal,
  queuedAt: number = performance.now() // Telemetria: momento em que entrou na fila
): Promise<{ output: string[]; error?: string; metrics: { waitTime: number; execTime: number } }> {
  
  const runId = crypto.randomUUID(); // ID único para garantir a integridade da resposta
  const waitTime = performance.now() - queuedAt;

  if (signal?.aborted) {
    throw new DOMException("Execution aborted before start.", "AbortError");
  }

  const socket = await connectSandboxSocket();

  return new Promise((resolve, reject) => {
    const startTime = performance.now();

    const cleanup = () => {
      if (signal) signal.removeEventListener("abort", abortHandler);
      socket.removeEventListener("message", messageHandler);
      socket.removeEventListener("error", errorHandler);
      clearTimeout(timeout);
    };

    const abortHandler = () => {
      cleanup();
      // Notifica o backend para matar o processo específico deste runId
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "abort", runId }));
      }
      reject(new DOMException("Remote execution intercepted (Abort).", "AbortError"));
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Remote execution timeout (15s)"));
    }, 15000);

    const messageHandler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        // CORREÇÃO CRÍTICA: Filtra apenas mensagens desta execução
        if (data.runId !== runId) return;

        cleanup();
        resolve({
          output: data.output || [],
          error: data.error,
          metrics: {
            waitTime,
            execTime: performance.now() - startTime
          }
        });
      } catch (e) {
        // Ignora mensagens mal formadas
      }
    };

    const errorHandler = (err: Event) => {
      cleanup();
      reject(err);
    };

    if (signal) signal.addEventListener("abort", abortHandler);
    socket.addEventListener("message", messageHandler);
    socket.addEventListener("error", errorHandler);

    // Envia o payload com o ID de correlação
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "execute",
        runId, // O backend deve ecoar este ID na resposta
        language,
        code
      }));
    } else {
      cleanup();
      reject(new Error("WebSocket is not in OPEN state."));
    }
  });
}
