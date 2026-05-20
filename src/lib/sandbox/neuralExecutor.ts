"use client";

import {
  ExecutionResult,
  IEngineExecutor
} from "./engines";

export class NeuralExecutor
  implements IEngineExecutor {
  async execute(
    code: string,
    language: string,
    signal?: AbortSignal,
  ): Promise<ExecutionResult> {
    // CANCELAMENTO
    if (signal?.aborted) {
      return {
        output: [],
        error: "Execution aborted.",
      };
    }

    const startedAt = performance.now();

    try {
      // SIMULAÇÃO DE CAMADA "NEURAL"
      // Aqui futuramente você pode:
      // - conectar LLM local
      // - fazer análise estática
      // - gerar hints
      // - prever erros
      // - otimizar código
      // - executar reasoning
      // - criar fallback inteligente

      const analysis = analyzeCode(code, language);

      const executionTime =
        performance.now() - startedAt;

      return {
        output: [
          `🧠 Neural Runtime Activated`,
          `Language: ${language}`,
          `Code Size: ${code.length} chars`,
          `Complexity Score: ${analysis.complexity}`,
          `Estimated Quality: ${analysis.quality}`,
          `Detected Patterns: ${analysis.patterns.join(", ")}`,
          `Inference Layer: Stable`,
        ],

        metrics: {
          engine: "neural",
          executionTime,
          memoryUsage: estimateMemory(code),
        },
      };
    } catch (err: any) {
      return {
        output: [],
        error:
          err?.message ||
          "Neural execution failure.",
      };
    }
  }
}

/* =========================================================
   INTERNAL ANALYSIS UTILITIES
========================================================= */

function analyzeCode(
  code: string,
  language: string,
) {
  const complexity =
    estimateComplexity(code);

  const quality =
    estimateQuality(code);

  const patterns =
    detectPatterns(code, language);

  return {
    complexity,
    quality,
    patterns,
  };
}

function estimateComplexity(
  code: string,
): string {
  const lines = code.split("\n").length;

  if (lines < 20) return "LOW";
  if (lines < 100) return "MEDIUM";

  return "HIGH";
}

function estimateQuality(
  code: string,
): string {
  let score = 100;

  if (code.includes("any")) score -= 15;
  if (code.includes("console.log")) score -= 5;
  if (code.includes("var ")) score -= 20;

  if (score > 90) return "A";
  if (score > 75) return "B";
  if (score > 50) return "C";

  return "D";
}

function detectPatterns(
  code: string,
  language: string,
): string[] {
  const patterns: string[] = [];

  if (
    code.includes("async") ||
    code.includes("await")
  ) {
    patterns.push("async-flow");
  }

  if (
    code.includes("class ")
  ) {
    patterns.push("oop");
  }

  if (
    code.includes("map(") ||
    code.includes("filter(")
  ) {
    patterns.push("functional");
  }

  if (
    language === "sql"
  ) {
    patterns.push("query-engine");
  }

  if (
    code.includes("fetch(")
  ) {
    patterns.push("networking");
  }

  if (!patterns.length) {
    patterns.push("generic");
  }

  return patterns;
}

function estimateMemory(
  code: string,
): number {
  return Math.max(
    4,
    Math.ceil(code.length / 120),
  );
}