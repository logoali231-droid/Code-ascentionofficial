import { ENGINE_REGISTRY, ExecutionResult, resolveEngine } from "./engines";
import { sandboxProcessManager } from "./sandboxProcessManager";
// CORREÇÃO: Importe a instância 'telemetry' em vez da classe
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

  // Definição clara do ID de execução para garantir consistência
  const executionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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

          // APLIQUE ESTA ESTRUTURA: Remova chaves extras como 'topic' ou 'metric'
          // se o seu 'TelemetryMetric' não as possuir explicitamente.
          telemetry.record({
            value: ttft,
            context: { language, executionId, type: 'TTFT' },
            type: "execution_time",
            engine: "",
            language: "",
            duration: 0,
            success: false
          });
        }

        proc.pushLog(`[${type.toUpperCase()}] ${chunk}`);
      }
    );

    const totalLatency = performance.now() - startTime;

    // APLIQUE ESTA ESTRUTURA: Certifique-se que estas chaves (value, context)
    // coincidem com as propriedades definidas na interface TelemetryMetric.
    telemetry.record({
      value: totalLatency,
      context: { engine: engineType, type: 'EXECUTION_LATENCY' },
      type: "execution_time",
      engine: "",
      language: "",
      duration: 0,
      success: false
    });

    if (result.error) {
      proc.crash(result.error);
    } else {
      proc.stop();
      proc.pushLog(`[EXIT] Process finished successfully`);
    }

    return result;

  } catch (err: any) {
    if (signal?.aborted || err.name === 'AbortError') {
      proc.pushLog(`[EXIT] Process aborted by user`);
      return { output: [], error: "Execution aborted" };
    }

    proc.crash(err.message);
    return { output: [], error: err.message };
  }
}