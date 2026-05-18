export type SupportedLanguage =
  | "javascript"
  | "typescript"
  | "html"
  | "lua"
  | "wasm"
  | "actionscript"
  | "coffeescript"
  | "python"
  | "ruby"
  | "java"
  | "csharp"
  | "cpp"
  | "go"
  | "rust"
  | "php"
  | "kotlin"
  | "scala"
  | "shell"
  | "perl"
  | "groovy"
  | "c"
  | "zig"
  | "cobol"
  | "fortran"
  | "julia"
  | "haskell"
  | "r"
  | "elixir"
  | "erlang"
  | "clojure"
  | "lisp"
  | "prolog"
  | "pascal"
  | "delphi"
  | "vbnet"
  | "vb"
  | "vba"
  | "powershell"
  | "bash"
  | "tcl"
  | "assembly"
  | "solidity"
  | "apex"
  | "ada"
  | "fsharp"
  | "swift"
  | "dart"
  | "matlab"
  | "abap"
  | "vhdl"
  | "verilog"
  | "scratch"
  | "smalltalk"
  | "scheme"
  | "plsql"
  | "kotlin-native"
  | "neural"
  | "sql"
  | "logo"
  | "small basic"
  | (string & Record<never, never>);

export type ExerciseMode = "text" | "code" | "output" | "project";

export interface EditorConfig {
  language: SupportedLanguage;
  mode?: ExerciseMode;
  readOnly?: boolean;
  placeholder?: string;
  starterCode?: string;
}

export type Language = SupportedLanguage;
export type EngineType = "local" | "wasm" | "remote" | "neural"; // Garanta que este tipo existe aqui ou em engines.ts
