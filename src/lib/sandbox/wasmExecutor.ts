"use client";

import { loadPyodide } from "pyodide";

let pyodideInstance: any = null;


async function loadPyodideRuntime() {
  if (pyodideInstance) return pyodideInstance;

  // 1. Call loadPyodide and wait for the instance
  pyodideInstance = await loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/"
  });

  // 2. Return the instance directly (removed the broken pyodideModule line)
  return pyodideInstance;
}


export async function runWasm(
  code: string,
  language: string
) {
  try {

    switch (language.toLowerCase()) {

      case "python":
      case "py": {

        const pyodide = await loadPyodideRuntime();

        let output = "";

        pyodide.setStdout({
          batched: (text: string) => {
            output += text + "\n";
          }
        });

        pyodide.setStderr({
          batched: (text: string) => {
            output += "[ERROR] " + text + "\n";
          }
        });

        await pyodide.runPythonAsync(code);

        return {
          output: output
            .split("\n")
            .filter(Boolean)
        };
      }

      default:
        return {
          output: [],
          error: `WASM runtime unsupported for ${language}`
        };
    }

  } catch (err: any) {

    return {
      output: [],
      error: err.message
    };

  }
}