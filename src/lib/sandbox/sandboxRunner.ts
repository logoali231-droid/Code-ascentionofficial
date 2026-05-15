"use client";

import { ENGINE_MAP } from "./engines";

import { runLocal } from "./localExecutor";
import { runRemote } from "./remoteExecutor";
import { runNeural } from "./neuralExecutor";
import { runWasm } from "./wasmExecutor";

import {
  Language,
  SandboxResult
} from "./types";
import { SandboxFile } from "@/components/SandboxEditor";

// Adicione no topo do seu sandboxRunner.ts ou onde você gerencia a execução
export function executeInWorker(
  mainFile: SandboxFile,
  allFiles: SandboxFile[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Inicializa o worker
    const worker = new Worker(
      new URL("../sandbox.worker.ts", import.meta.url)
    );

    worker.onmessage = (e) => {

      if (e.data.type === "BUNDLE_READY") {

        resolve(e.data.payload.code);

        worker.terminate();

      }

      if (e.data.type === "ERROR") {

        reject(new Error(e.data.payload));

        worker.terminate();

      }

    };

    worker.onerror = (err) => {

      reject(err);

      worker.terminate();

    };

    setTimeout(() => {

      reject(new Error("Worker timeout"));

      worker.terminate();

    }, 10000);

    worker.postMessage({
      type: "BUNDLE_FILES",
      payload: { mainFile, allFiles }
    });
  });
}

export async function executeSandboxCode(
  code: string,
  language: Language
): Promise<SandboxResult> {

  const engine = ENGINE_MAP[language];

  switch (engine) {

    case "local":
      return await runLocal(code, language) as SandboxResult;

    case "remote":
      return await runRemote(code, language) as SandboxResult;

    case "wasm":
      return await runWasm(code, language) as SandboxResult;

    case "neural":
      return await runNeural(code, language) as SandboxResult;

    default:
      return {
        output: [],
        error: "Unknown engine"
      };
  }
}