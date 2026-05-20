import { ExecutionResult, resolveEngine, ENGINE_REGISTRY } from "./engines";
import { sandboxProcessManager } from "./sandboxProcessManager";

export async function runSandbox(
  code: string,
  language: string,
  signal?: AbortSignal,
): Promise<ExecutionResult> {
  const proc = sandboxProcessManager.createProcess(language);

  proc.pushLog(`[BOOT] Starting ${language} runtime`);

  const engineType = resolveEngine(language);
  const executor = ENGINE_REGISTRY[engineType];

  if (!executor) {
    const errorMsg = `No executor found for ${engineType}`;
    proc.crash(errorMsg);
    return { output: [], error: errorMsg };
  }

  proc.pushLog(`[ENGINE] Resolved engine: ${engineType}`);

  try {
    proc.pushLog(`[EXEC] Executing sandbox process`);

    // Chamada única e correta, passando o callback tipado
    const result = await executor.execute(code, language, signal, (chunk: string) => {
      proc.pushLog(chunk);
    });

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