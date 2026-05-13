"use client";

import { Language } from "./sandboxRunner";

export type EngineType =
  | "local"
  | "wasm"
  | "remote"
  | "neural";

export const ENGINE_MAP: Record<Language, EngineType> = {
  javascript: "local",
  typescript: "local",
  html: "local",
  lua: "local",
  wasm: "local",

  python: "wasm",
  ruby: "wasm",

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

  swift: "neural",
  dart: "neural",
  matlab: "neural",
  cobol: "neural",
  abap: "neural",
  vhdl: "neural",
  verilog: "neural",
  scratch: "neural",
  fortran: "neural",
  ada: "neural",
  lisp: "neural",
  prolog: "neural",
  smalltalk: "neural",
  scheme: "neural",
  plsql: "neural",
  solidity: "neural",
  apex: "neural",
  clojure: "neural",
  fsharp: "neural",
  vbnet: "neural",
  delphi: "neural",
  "objective-c": "neural",
  powershell: "neural",
  elixir: "neural",
  haskell: "neural",
  r: "neural",
  julia: "neural",
  d: "neural",
  pascal: "neural",
  "kotlin-native": "neural",
  sql: "neural",
  actionscript: "neural"
};