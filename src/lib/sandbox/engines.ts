import { EngineType, SandboxResult } from "./types";
export interface IEngineExecutor {
  execute(
    code: string,
    language: string,
    signal?: AbortSignal
  ): Promise<SandboxResult>;
}


export const ENGINE_MAP: Record<string, EngineType> = {
  javascript: "local",
  typescript: "local",
  html: "local",
  lua: "local",
  wasm: "wasm",

  python: "wasm",
  ruby: "wasm",

  java: "remote",
  csharp: "remote",
  cpp: "remote",
  go: "remote",
  rust: "remote",
  php: "remote",
  kotlin: "remote",

  swift: "neural",
  dart: "neural",
  sql: "neural",
};

export const getEngine = (lang: string): EngineType => {
  return ENGINE_MAP[lang] ?? "neural";
};