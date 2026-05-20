"use client";

import { loadPyodide } from "pyodide";

import { ExecutionResult, IEngineExecutor } from "./engines";

let pyodide: any = null;

export class WasmExecutor implements IEngineExecutor {
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

    if (!pyodide) {
      pyodide = await loadPyodide({
        indexURL:
          "https://cdn.jsdelivr.net/pyodide/v0.29.0/full/",
      });
    }

    try {
      const result = await pyodide.runPythonAsync(code);

      return {
        output: [String(result)],

        metrics: {
          engine: "wasm",
        },
      };
    } catch (err: any) {
      return {
        output: [],
        error: err.message,
      };
    }
  }
}