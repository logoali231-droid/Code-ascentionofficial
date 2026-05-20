export type Language =
  | "javascript"
  | "typescript"
  | "html"
  | "python"
  | "shell"
  | "ruby"
  | "java"
  | "cpp"
  | "c"
  | "rust"
  | "go"
  | "kotlin"
  | "scala"
  | "csharp"
  | "php"
  | "swift"
  | "matlab"
  | "lua"
  | "scratch"
  | "scheme"
  | "lisp"
  | "smalltalk"
  | "prolog"

  | "perl"
  | "dart"
  | "kotlin-native"
  | "objective-c"
  | "powershell"
  | "elixir"
  | "haskell"
  | "r"
  | "julia"
  | "d"
  | "pascal"
  | "groovy"
  | "cobol"
  | "abap"
  | "fortran"
  | "ada"
  | "plsql"
  | "apex"
  | "fsharp"
  | "vbnet"
  | "delphi"
  | "solidity"
  | "verilog"
  | "vhdl"
  | "matlab"
  | "scratch"
  | "smalltalk"
  | "prolog"
  | "actionscript"
  | "clojure"
  | "wasm"
  | "sql";

export type Engine =
  | "local"
  | "wasm"
  | "remote"
  | "neural";

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
  ): Promise<ExecutionResult>;
}