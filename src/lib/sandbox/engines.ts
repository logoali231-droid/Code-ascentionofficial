"use client";

import { Engine, IEngineExecutor } from "./types";

import { LocalExecutor } from "./localExecutor";
import { WasmExecutor } from "./wasmExecutor";
import { RemoteExecutor } from "./remoteExecutor";
import { NeuralExecutor } from "./neuralExecutor";

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