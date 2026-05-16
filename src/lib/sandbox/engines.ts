"use client";

import { Language, EngineType } from "./types";

// Usar string no Record resolve o conflito com a string dinâmica do autocompletar
export const ENGINE_MAP: Record<string, EngineType> = {
  // --- LOCAL ENGINE (Interpretadores leves client-side) ---
  javascript: "local",
  typescript: "local",
  html: "local",
  lua: "local",
  wasm: "local",
  actionscript: "local",
  coffeescript: "local",

  // --- WASM ENGINE (Runtimes pesados compilados em binário web) ---
  python: "wasm",
  ruby: "wasm",

  // --- REMOTE ENGINE (Cluster de Containers Docker - Compilação Pesada/Isolada) ---
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

  // --- NEURAL ENGINE (Simulação lógica baseada em AST/Heurística Educacional) ---
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
  "small basic": "neural"     
};

// Função utilitária opcional para buscar o motor com segurança caso digitem uma string customizada
export const getEngine = (lang: Language): EngineType => {
  return ENGINE_MAP[lang as string] || "neural"; // "neural" ou qualquer motor padrão para linguagens desconhecidas
};
