"use client";

import { connectSandboxSocket } from "./sandboxSocket";

export async function runRemote(
  code: string,
  language: string,
  signal?: AbortSignal,
): Promise<{ output: string[]; error?: string }> {
  if (signal?.aborted) {
    return { output: [], error: "Execution aborted by system runtime." };
  }

  const socket = await connectSandboxSocket();

  return new Promise((resolve, reject) => {
    // ID único ou filtro de execução para garantir que este Handler só leia a resposta DESTA execução específica
    // (Útil se você rodar vários códigos ou compartilhar o socket)

    // Handler de cancelamento ativo acionado pela troca de contexto/abas (Safari Guard)
    const abortHandler = () => {
      cleanup();

      // Notifica o servidor remoto para dar um "docker stop/kill" no container ativo lá fora
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "abort" }));
      }

      reject(
        new DOMException(
          "Remote execution intercepted actively (Context switched).",
          "AbortError",
        ),
      );
    };

    // Centralizador de limpeza estrito (Remove absolutamente tudo para poupar RAM no iOS)
    const cleanup = () => {
      clearTimeout(timeout);
      if (signal) {
        signal.removeEventListener("abort", abortHandler);
      }
      socket.removeEventListener("message", messageHandler);
      socket.removeEventListener("error", errorHandler);
    };

    if (signal) {
      signal.addEventListener("abort", abortHandler);
    }

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("Remote execution timeout"));
    }, 15000);

    const messageHandler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        // Opcional: se o seu backend devolver um ID, filtre aqui (ex: if (data.runId !== meuId) return;)

        resolve({
          output: data.output || [],
          error: data.error,
        });
        cleanup(); // Garante a remoção dos escutadores imediatamente após o retorno
      } catch (e) {
        // Ignora mensagens mal-formatadas que não pertençam ao fluxo de execução atual
      }
    };

    const errorHandler = (err: Event) => {
      cleanup();
      reject(err);
    };

    // Vincula os escutadores
    socket.addEventListener("message", messageHandler);
    socket.addEventListener("error", errorHandler);

    // 1. Envia a ordem de execução inicial para o cluster Docker
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "execute",
          language,
          code,
        }),
      );
    } else {
      cleanup();
      reject(new Error("WebSocket is not in OPEN state."));
    }
  });
}
