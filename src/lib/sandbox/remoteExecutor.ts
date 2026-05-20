"use client";

import { IEngineExecutor, ExecutionResult } from "./types";

export class RemoteExecutor implements IEngineExecutor {
  async execute(
    code: string,
    language: string,
    signal?: AbortSignal,
  ): Promise<ExecutionResult> {
    if (signal?.aborted) {
      return {
        output: [],
        error: "Execution aborted.",
      };
    }

    const response = await fetch("/api/runtime/execute", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        code,
        language,
      }),

      signal,
    });

    if (!response.ok) {
      return {
        output: [],
        error: "Remote runtime failure.",
      };
    }

    const data = await response.json();

    return {
      output: data.output || [],
      error: data.error,

      metrics: {
        engine: "remote",
        executionTime: data.executionTime,
      },
    };
  }
}