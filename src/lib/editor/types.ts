export type SupportedLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "java"
  | "cpp"
  | "rust"
  | "go"
  | "lua"
  | "ruby"
  | "swift"
  | "kotlin"
  | "brainfuck"
  | "zig"
  | "plaintext"
  | string;

export type ExerciseMode =
  | "text"
  | "code"
  | "output"
  | "project";

export interface EditorConfig {
  language: SupportedLanguage;

  mode?: ExerciseMode;

  readOnly?: boolean;

  placeholder?: string;

  starterCode?: string;
}