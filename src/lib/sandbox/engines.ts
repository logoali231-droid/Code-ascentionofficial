"use client";


import { LocalExecutor } from "./localExecutor";
import { NeuralExecutor } from "./neuralExecutor";
import { RemoteExecutor } from "./remoteExecutor";
import { WasmExecutor } from "./wasmExecutor";

export const ENGINE_MAP: Record<string, Engine> = {
  javascript: "local",
  typescript: "local",
  html: "local",

  python: "wasm",
  ruby: "wasm",

  java: "remote",
  cpp: "remote",
  c: "remote",
  rust: "remote",
  go: "remote",
  kotlin: "remote",
  scala: "remote",
  csharp: "remote",
  php: "remote",

  swift: "neural",
  matlab: "neural",
  sql: "neural",
};

export const ENGINE_REGISTRY: Record<
  Engine,
  IEngineExecutor
> = {
  local: new LocalExecutor(),
  wasm: new WasmExecutor(),
  remote: new RemoteExecutor(),
  neural: new NeuralExecutor(),
};

export function resolveEngine(language: string): Engine {
  return ENGINE_MAP[language.toLowerCase()] || "neural";
}
export type Language = "javascript" |
  "typescript" |
  "html" |
  "python" |
  "shell" |
  "ruby" |
  "java" |
  "cpp" |
  "c" |
  "rust" |
  "go" |
  "kotlin" |
  "scala" |
  "csharp" |
  "php" |
  "swift" |
  "matlab" |
  "lua" |
  "scratch" |
  "scheme" |
  "lisp" |
  "smalltalk" |
  "prolog" |

  "perl" |
  "dart" |
  "kotlin-native" |
  "objective-c" |
  "powershell" |
  "elixir" |
  "haskell" |
  "r" |
  "julia" |
  "d" |
  "pascal" |
  "groovy" |
  "cobol" |
  "abap" |
  "fortran" |
  "ada" |
  "plsql" |
  "apex" |
  "fsharp" |
  "vbnet" |
  "delphi" |
  "solidity" |
  "verilog" |
  "vhdl" |
  "matlab" |
  "scratch" |
  "smalltalk" |
  "prolog" |
  "actionscript" |
  "clojure" |
  "wasm" |
  "sql";

export type Engine = "local" |
  "wasm" |
  "remote" |
  "neural";

export interface SandboxResult {
  output: string[];
  error?: string;
  metrics?: {
    executionTime?: number;
    memoryUsage?: number;
    engine?: string;
  };
}

export type ExecutionResult = SandboxResult;

export interface IEngineExecutor {
  execute(
    code: string,
    language: string,
    signal?: AbortSignal,
    onLog?: (chunk: string) => void
  ): Promise<ExecutionResult>;
}
