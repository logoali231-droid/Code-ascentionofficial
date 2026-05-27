import { ENGINE_REGISTRY, ExecutionResult, resolveEngine } from "./engines";
import { sandboxProcessManager } from "./sandboxProcessManager";
import { telemetry } from "./telemetryManager";

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

  // Uso de UUID para melhor consistência
  const executionId = crypto.randomUUID();
  const startTime = performance.now();
  let firstTokenReceived = false;

  try {
    proc.pushLog(`[BOOT] Starting ${language} runtime`);
    proc.pushLog(`[EXEC] Executing with ${engineType} engine`);

    const result = await executor.execute(
      code,
      language,
      signal,
      (chunk: string, type: 'stdout' | 'stderr' | 'meta') => {
        if (!firstTokenReceived) {
          firstTokenReceived = true;
          const ttft = performance.now() - startTime;

          // Registro de Time to First Token (TTFT)
          telemetry.record({
            type: "execution_time",
            value: ttft,
            engine: engineType,
            language: language,
            duration: ttft,
            success: true,
            context: { 
                language, 
                executionId, 
                type: 'TTFT', 
                engine: engineType 
            },
          });
        }

        proc.pushLog(`[${type.toUpperCase()}] ${chunk}`);
      }
    );

    const totalLatency = performance.now() - startTime;

    // Registro de Latência Total
    telemetry.record({
      type: "execution_time",
      value: totalLatency,
      engine: engineType,
      language: language,
      duration: totalLatency,
      success: !result.error, // True se não houve erro
      context: { 
          executionId, 
          type: 'EXECUTION_LATENCY' 
      },
    });

    if (result.error) {
      proc.crash(result.error);
    } else {
      proc.stop();
      proc.pushLog(`[EXIT] Process finished successfully`);
    }

    return result;

  } catch (err: any) {
    const isAbort = signal?.aborted || err.name === 'AbortError';
    
    proc.pushLog(isAbort ? `[EXIT] Process aborted by user` : `[ERROR] ${err.message}`);
    
    // Opcional: Registrar erro na telemetria
    telemetry.record({
      type: "execution_error",
      value: 0,
      engine: engineType,
      language: language,
      duration: performance.now() - startTime,
      success: false,
      context: { executionId, error: err.message }
    });

    return { output: [], error: isAbort ? "Execution aborted" : err.message };
  }
}