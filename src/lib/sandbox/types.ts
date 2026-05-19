"use client";

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
  | "lua"
  | "ruby"
  | "kotlin"
  | "scala"
  | "shell"
  | "perl"
  | "groovy"
  | "swift"
  | "dart"
  | "matlab"
  | "cobol"
  | "abap"
  | "vhdl"
  | "verilog"
  | "scratch"
  | "fortran"
  | "ada"
  | "lisp"
  | "prolog"
  | "smalltalk"
  | "scheme"
  | "plsql"
  | "solidity"
  | "apex"
  | "clojure"
  | "fsharp"
  | "vbnet"
  | "delphi"
  | "objective-c"
  | "powershell"
  | "elixir"
  | "haskell"
  | "r"
  | "julia"
  | "d"
  | "pascal"
  | "kotlin-native"
  | "sql"
  | "actionscript"
  | "wasm";

export type EngineType = "local" | "remote" | "wasm" | "neural";


export interface SandboxResult {
  output: string[];
  error?: string;
}

// O contrato que todos os engines DEVEM seguir
export interface IEngineExecutor {
  execute(code: string, language: string): Promise<SandboxResult>;
}
