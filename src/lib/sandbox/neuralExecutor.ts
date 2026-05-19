import { IEngineExecutor, SandboxResult } from "../types";

export class NeuralExecutor implements IEngineExecutor {
  async execute(
    code: string, 
    language: string, 
    signal?: AbortSignal
  ): Promise<SandboxResult> {
    
    // O checkpoint de abort deve ser mantido no início da execução
    if (signal?.aborted) {
      return {
        output: [],
        error: "Neural execution aborted.",
      };
    }

    // depois integrar com o TelemetryManager aqui
    const startTime = performance.now();

    console.log(
      `[Neural Engine] Simulando aproximação para código de ${language} (${code.length} bytes)`,
    );

    // Simulação de processamento
    return {
      output: [
        `[NEURAL:${language}] Simulated execution complete.`,
        "Output approximation generated.",
      ],
      metrics: {
        waitTime: 0, // Como é síncrono/local, não há tempo de fila aqui
        execTime: performance.now() - startTime,
      }
    };
  }
}
