/**
 * Central Sandbox Manager - Code Ascension
 * Controla travamentos de CPU disparando o terminate() imediatamente no estouro de timeout.
 */

interface PythonRunConfig {
  code: string;
  timeoutMs?: number;
}

export function executarPythonIsolado({
  code,
  timeoutMs = 4000,
}: PythonRunConfig): Promise<any> {
  return new Promise((resolve, reject) => {
    // 1. Instancia o Worker de Python de forma efêmera
    let worker: Worker | null = new Worker(
      new URL("./pythonWorker.ts", import.meta.url),
    );

    // 2. Cria o timer gerenciador externo na thread de interface
    const timerId = setTimeout(() => {
      if (worker) {
        console.warn(
          "[Sandbox Manager] CPU Lockup detectado no script Python. Invocando worker.terminate()...",
        );
        worker.terminate(); // Mata o worker e libera a CPU do cliente imediatamente
        worker = null;
        reject(
          new Error(
            `EXECUTION_TIMEOUT: Código excedeu o limite de segurança de ${timeoutMs}ms.`,
          ),
        );
      }
    }, timeoutMs);

    // 3. Escuta os retornos do ambiente WebAssembly
    worker.onmessage = (e: MessageEvent) => {
      clearTimeout(timerId); // Desativa o timer de morte
      if (worker) worker.terminate(); // Limpa o worker após o uso com sucesso
      resolve(e.data);
    };

    worker.onerror = (err) => {
      clearTimeout(timerId);
      if (worker) worker.terminate();
      reject(err);
    };

    // 4. Manda o código para o Worker iniciar a execução
    worker.postMessage({ type: "RUN_PYTHON", payload: { code } });
  });
}
