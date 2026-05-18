"use client";

import { ENGINE_MAP } from "./engines";
import { runLocal } from "./localExecutor";
import { runRemote } from "./remoteExecutor";
import { runNeural } from "./neuralExecutor";
import { runWasm } from "./wasmExecutor";
import { telemetry } from "./telemetryManager"; // Importando o gerenciador

import { Language, SandboxResult } from "./types";
import { SandboxFile } from "@/components/SandboxEditor";

/**
 * Executa o empacotamento de arquivos dentro de um Worker respeitando o cancelamento ativo
 */
export function executeInWorker(
  mainFile: SandboxFile,
  allFiles: SandboxFile[],
  signal?: AbortSignal,
): Promise<string> {
  const startTime = performance.now(); // Início da métrica de bundle

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new DOMException("Bundling aborted.", "AbortError"));
    }

    const worker = new Worker(new URL("../sandbox.worker.ts", import.meta.url));

    const abortHandler = () => {
      worker.terminate();
      reject(
        new DOMException(
          "Bundling process terminated by user or context switch.",
          "AbortError",
        ),
      );
    };

    if (signal) {
      signal.addEventListener("abort", abortHandler);
    }

    const cleanup = () => {
      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener("abort", abortHandler);
      }
      worker.terminate();
    };

    worker.onmessage = (e) => {
      if (e.data.type === "BUNDLE_READY") {
        // Registra sucesso do empacotamento
        telemetry.record({
          type: "bundle_time",
          engine: "worker",
          language: "multiple",
          duration: performance.now() - startTime,
          success: true,
        });

        resolve(e.data.payload.code);
        cleanup();
      }

      if (e.data.type === "ERROR") {
        // Registra falha lógica de bundle
        telemetry.record({
          type: "bundle_time",
          engine: "worker",
          language: "multiple",
          duration: performance.now() - startTime,
          success: false,
        });

        reject(new Error(e.data.payload));
        cleanup();
      }
    };

    worker.onerror = (err) => {
      telemetry.record({
        type: "bundle_time",
        engine: "worker",
        language: "multiple",
        duration: performance.now() - startTime,
        success: false,
      });

      reject(err);
      cleanup();
    };

    const timeoutId = setTimeout(() => {
      telemetry.record({
        type: "engine_fault",
        engine: "worker",
        language: "multiple",
        duration: performance.now() - startTime,
        success: false,
      });

      reject(new Error("Worker timeout"));
      cleanup();
    }, 10000);

    worker.postMessage({
      type: "BUNDLE_FILES",
      payload: { mainFile, allFiles },
    });
  });
}

/**
 * Despacha a execução do código para o motor correto repassando o AbortSignal
 */
/**
 * Despacha a execução do código para o motor correto repassando o AbortSignal
 */
export async function executeSandboxCode(
  code: string,
  language: Language,
  signal?: AbortSignal,
): Promise<SandboxResult> {
  if (signal?.aborted) {
    throw new DOMException("Execution aborted before starting.", "AbortError");
  }

  const engine = ENGINE_MAP[language];
  const startTime = performance.now();
  let success = false;

  // Handler para rejeitar imediatamente a Promise caso o Safari suspenda a aba durante o processamento
  const abortPromise = new Promise<SandboxResult>((_, reject) => {
    if (signal) {
      signal.addEventListener("abort", () => {
        reject(
          new DOMException(
            "Execution interrupted by tab lifecycle change.",
            "AbortError",
          ),
        );
      });
    }
  });

  try {
    let result: SandboxResult;

    // Corrida entre a execução do motor e o sinal de aborto abrupto do iOS
    const executionPromise = (async () => {
      switch (engine) {
        case "local":
          return (await runLocal(code, language, signal)) as SandboxResult;

        case "remote":
          // O runRemote vai disparar o fetch() passando o signal. Se abortar, a rede corta na hora.
          return (await runRemote(code, language, signal)) as SandboxResult;

        case "wasm":
          return (await (runWasm as any)(
            code,
            language,
            signal,
          )) as SandboxResult;

        case "neural":
          return (await (runNeural as any)(
            code,
            language,
            signal,
          )) as SandboxResult;

        default:
          return {
            output: [],
            error: `Unknown engine for language: ${language}`,
          };
      }
    })();

    // Se o sinal disparar primeiro, o abortPromise joga o erro pro catch
    result = await Promise.race([executionPromise, abortPromise]);

    success = !result.error;

    telemetry.record({
      type: "execution_time",
      engine,
      language,
      duration: performance.now() - startTime,
      success,
    });

    return result;
  } catch (error: any) {
    telemetry.record({
      type: "engine_fault",
      engine: engine || "unknown",
      language,
      duration: performance.now() - startTime,
      success: false,
    });

    if (error.name === "AbortError") {
      return {
        output: [],
        error:
          "[SYSTEM] Processamento interrompido: A aba foi suspensa ou limpa da memória.",
      };
    }
    throw error;
  }
}
