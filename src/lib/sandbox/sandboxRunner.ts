"use client";

import { ENGINE_MAP } from "./engines";
import { runLocal } from "./localExecutor";
import { runRemote } from "./remoteExecutor";
import { runNeural } from "./neuralExecutor";
import { runWasm } from "./wasmExecutor";

export type Language =
  | "python"
  | "javascript"
  | "java"
  | "typescript"
  | "csharp"
  | "html"
  | "cpp"
  | "go"
  | "rust"
  | "php"
  | "lua";

export interface SandboxResult {
  output: string[];
  error?: string;
}

export async function executeSandboxCode(
  code: string,
  language: Language
): Promise<SandboxResult> {

  const engine = ENGINE_MAP[language];

  switch (engine) {

    case "local":
      return runLocal(code, language);

    case "remote":
      return runRemote(code, language);

    case "wasm":
      return runWasm(code, language);

    case "neural":
      return runNeural(code, language);

    default:
      return {
        output: [],
        error: "Unknown engine"
      };
  }
}