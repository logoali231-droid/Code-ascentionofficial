import { IEngineExecutor, SandboxResult } from "./types";
import { loadPyodide } from "pyodide";

let pyodideInstance: any = null;

async function loadPyodideRuntime() {
  if (pyodideInstance) return pyodideInstance;

  pyodideInstance = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/",
  });

  return pyodideInstance;
}

export class WasmExecutor implements IEngineExecutor {
  async run(
    code: string,
    language: string,
  ): Promise<SandboxResult> {
    try {
      switch (language.toLowerCase()) {
        case "python":
        case "py": {
          const pyodide = await loadPyodideRuntime();

          let output = "";

          pyodide.setStdout({
            batched: (text: string) => {
              output += text + "\n";
            },
          });

          pyodide.setStderr({
            batched: (text: string) => {
              output += "[ERROR] " + text + "\n";
            },
          });

          await pyodide.runPythonAsync(code);

          return {
            output: output.split("\n").filter(Boolean),
          };
        }

        default:
          return {
            output: [],
            error: `WASM runtime unsupported for ${language}`,
          };
      }
    } catch (err: any) {
      return {
        output: [],
        error: err.message,
      };
    }
  }
}
