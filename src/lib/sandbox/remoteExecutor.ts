"use client";

import { connectSandboxSocket } from "./sandboxSocket";

export async function runRemote(
  code: string,
  language: string,
  signal?: AbortSignal // <-- Injeção do sinal vinda da Runtime Queue
): Promise<{ output: string[]; error?: string }> {
  
  if (signal?.aborted) {
    return { output: [], error: "Execution aborted by system runtime." };
  }

  const socket = await connectSandboxSocket();

  return new Promise((resolve, reject) => {
    // 1. Envia a ordem de execução inicial
    socket.send(
      JSON.stringify({
        type: "execute",
        language,
        code
      })
    );

    // Handler de cancelamento ativo acionado pela troca de contexto/abas
    const abortHandler = () => {
      clearTimeout(timeout);
      
      // Notifica o servidor remoto para matar o container/processo ativo lá fora
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "abort" }));
      }
      
      cleanup();
      reject(new DOMException("Remote execution intercepted actively (Context switched).", "AbortError"));
    };

    if (signal) {
      signal.addEventListener("abort", abortHandler);
    }

    // Centralizador de limpeza de escutadores para o ciclo de vida deste Promise
    const cleanup = () => {
      clearTimeout(timeout);
      if (signal) {
        signal.removeEventListener("abort", abortHandler);
      }
      socket.removeEventListener("message", messageHandler);
      socket.removeEventListener("error", errorHandler);
    };

    const timeout = setTimeout(() => {
      reject(new Error("Remote execution timeout"));
      cleanup();
    }, 15000);

    const messageHandler = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      resolve({
        output: data.output || [],
        error: data.error
      });
      cleanup();
    };

    const errorHandler = (err: Event) => {
      reject(err);
      cleanup();
    };

    // Vincula os escutadores gerenciáveis manualmente (removendo o { once: true } para controle total do cleanup)
    socket.addEventListener("message", messageHandler);
    socket.addEventListener("error", errorHandler);
  });
}