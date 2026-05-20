import { ExecutionResult, resolveEngine, ENGINE_REGISTRY } from "./engines";
import { sandboxProcessManager } from "./sandboxProcessManager";

export async function runSandbox(
  code: string,
  language: string,
  signal?: AbortSignal,
): Promise<ExecutionResult> {
  const proc = sandboxProcessManager.createProcess(language);
  const engineType = resolveEngine(language);
  const executor = ENGINE_REGISTRY[engineType];

  if (!executor) {
    const errorMsg = `No executor found for ${engineType}`;
    proc.crash(errorMsg);
    return { output: [], error: errorMsg };
  }

  try {
    proc.pushLog(`[BOOT] Starting ${language} runtime`);
    proc.pushLog(`[EXEC] Executing with ${engineType} engine`);

    // O fluxo é assíncrono: onLog alimenta a UI via proc.pushLog
    const result = await executor.execute(
  code, 
  language, 
  signal, 
  (chunk: string, type: 'stdout' | 'stderr' | 'meta') => {
    proc.pushLog(`[${type.toUpperCase()}] ${chunk}`);
  }
);

    if (result.error) {
      proc.crash(result.error);
    } else {
      proc.stop();
      proc.pushLog(`[EXIT] Process finished successfully`);
    }

    return result;
  } catch (err: any) {
    proc.crash(err.message);
    return { output: [], error: err.message };
  }
}
