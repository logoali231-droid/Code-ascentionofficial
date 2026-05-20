"use client";

import { ENGINE_REGISTRY, resolveEngine, Language, ExecutionResult } from "./engines";
import { sandboxProcessManager } from "./sandboxProcessManager";

/* =========================================================
   CORE SANDBOX ORCHESTRATOR
========================================================= */

export async function runSandbox(
  code: string,
  language: Language,
  signal?: AbortSignal,
): Promise<ExecutionResult> {
  const proc = sandboxProcessManager.createProcess(language);

  proc.pushLog(`[BOOT] Starting ${language} runtime`);

  const engineType = resolveEngine(language);
  proc.pushLog(`[ENGINE] Resolved engine: ${engineType}`);

  const executor = ENGINE_REGISTRY[engineType];

  if (!executor) {
    const errorMsg = `No executor found for ${engineType}`;
    proc.crash(errorMsg);

    return {
      output: [],
      error: errorMsg,
    };
  }

  try {
    proc.pushLog(`[EXEC] Executing sandbox process`);

    // Acopla o sinal para interrupções sob demanda ou timeouts da Etapa 1
    const result = await executor.execute(code, language, signal);

    if (result.output) {
      for (const line of result.output) {
        proc.pushLog(String(line));
      }
    }

    if (result.error) {
      proc.crash(result.error);
    } else {
      proc.stop();
      proc.pushLog(`[EXIT] Process finished successfully`);
    }

    return result;
  } catch (err: any) {
    proc.crash(err.message);

    return {
      output: [],
      error: err.message,
    };
  }
}

/* =========================================================
   BACKWARD COMPATIBILITY LAYER
========================================================= */

export const executeSandboxCode = runSandbox;