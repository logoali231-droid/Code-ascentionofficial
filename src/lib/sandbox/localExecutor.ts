"use client";

import { IEngineExecutor, ExecutionResult } from "./types";

export class LocalExecutor implements IEngineExecutor {
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

    return new Promise((resolve) => {
      const workerCode = `
        self.onmessage = async (e) => {
          const logs = [];

          const console = {
            log: (...args) => logs.push(args.join(" ")),
            error: (...args) => logs.push("[ERROR] " + args.join(" "))
          };

          try {
            const fn = new Function(
              "console",
              '"use strict";\\n' + e.data.code
            );

            await fn(console);

            self.postMessage({
              success: true,
              output: logs
            });

          } catch (err) {
            self.postMessage({
              success: false,
              error: err.message
            });
          }
        };
      `;

      const blob = new Blob([workerCode], {
        type: "application/javascript",
      });

      const workerUrl = URL.createObjectURL(blob);

      const worker = new Worker(workerUrl);

      const cleanup = () => {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
      };

      worker.onmessage = (e) => {
        cleanup();

        if (e.data.success) {
          resolve({
            output: e.data.output,
            metrics: {
              engine: "local",
            },
          });
        } else {
          resolve({
            output: [],
            error: e.data.error,
          });
        }
      };

      worker.onerror = (err) => {
        cleanup();

        resolve({
          output: [],
          error: err.message,
        });
      };

      worker.postMessage({ code, language });
    });
  }
}