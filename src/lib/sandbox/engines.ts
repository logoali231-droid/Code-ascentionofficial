"use client";

import { IEngineExecutor } from "./types";
import { LocalExecutor } from "./engines/LocalExecutor";
import { WasmExecutor } from "./engines/WasmExecutor";
import { RemoteExecutor } from "./engines/RemoteExecutor";
import { NeuralExecutor } from "./engines/NeuralExecutor";

// 1. Instanciamos os Singletons. 
// O Registry mantém apenas UMA instância viva de cada executor.
const EXECUTOR_REGISTRY: Record<string, IEngineExecutor> = {
  local: new LocalExecutor(),
  wasm: new WasmExecutor(),
  remote: new RemoteExecutor(),
  neural: new NeuralExecutor(),
};

// 2. Mapeamento de Linguagem -> Chave do Registry
const LANGUAGE_MAP: Record<string, string> = {
  // Local
  javascript: "local",
  typescript: "local",
  html: "local",
  lua: "local",
  wasm: "local",
  actionscript: "local",
  coffeescript: "local",

  // Wasm
  python: "wasm",
  ruby: "wasm",

  // Remote (Cluster Docker)
  java: "remote",
  csharp: "remote",
  cpp: "remote",
  go: "remote",
  rust: "remote",
  php: "remote",
  kotlin: "remote",
  scala: "remote",
  shell: "remote",
  perl: "remote",
  groovy: "remote",
  c: "remote",
  zig: "remote",
  cobol: "remote",
  fortran: "remote",
  julia: "remote",
  haskell: "remote",
  r: "remote",
  elixir: "remote",
  erlang: "remote",
  clojure: "remote",
  lisp: "remote",
  prolog: "remote",
  pascal: "remote",
  delphi: "remote",
  vbnet: "remote",
  vb: "remote",
  vba: "remote",
  powershell: "remote",
  bash: "remote",
  tcl: "remote",
  assembly: "remote",
  solidity: "remote",
  apex: "remote",
  ada: "remote",
  fsharp: "remote",

  // Neural (Fallback)
  swift: "neural",
  dart: "neural",
  matlab: "neural",
  abap: "neural",
  vhdl: "neural",
  verilog: "neural",
  scratch: "neural",
  smalltalk: "neural",
  scheme: "neural",
  plsql: "neural",
  "kotlin-native": "neural",
  sql: "neural",
  logo: "neural",
  "small basic": "neural",
};

/**
 * Registry de Execução: O cérebro do orquestrador.
 * Ele retorna a implementação da estratégia (executor) 
 * baseada na linguagem solicitada.
 */
export const getExecutor = (lang: string): IEngineExecutor => {
  const engineKey = LANGUAGE_MAP[lang] || "neural";
  const executor = EXECUTOR_REGISTRY[engineKey];
  
  if (!executor) {
    throw new Error(`Executor para a linguagem '${lang}' não configurado no Registry.`);
  }
  
  return executor;
};
