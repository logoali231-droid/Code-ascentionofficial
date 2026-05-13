import { SupportedLanguage } from "./types";

export interface LanguageDefinition {
  id: SupportedLanguage;

  label: string;

  extension: string;

  executable: boolean;

  syntaxMode: string;
}

export const LANGUAGE_REGISTRY: Record<
  string,
  LanguageDefinition
> = {
  javascript: {
    id: "javascript",
    label: "JavaScript",
    extension: ".js",
    executable: true,
    syntaxMode: "javascript"
  },

  typescript: {
    id: "typescript",
    label: "TypeScript",
    extension: ".ts",
    executable: true,
    syntaxMode: "typescript"
  },

  python: {
    id: "python",
    label: "Python",
    extension: ".py",
    executable: true,
    syntaxMode: "python"
  },

  brainfuck: {
    id: "brainfuck",
    label: "Brainfuck",
    extension: ".bf",
    executable: false,
    syntaxMode: "plaintext"
  },

  zig: {
    id: "zig",
    label: "Zig",
    extension: ".zig",
    executable: false,
    syntaxMode: "rust"
  }
};

export function resolveLanguage(lang?: string) {
  if (!lang) {
    return {
      id: "plaintext",
      label: "Plain Text",
      extension: ".txt",
      executable: false,
      syntaxMode: "plaintext"
    };
  }

  return (
    LANGUAGE_REGISTRY[lang] || {
      id: lang,
      label: lang,
      extension: ".txt",
      executable: false,
      syntaxMode: "plaintext"
    }
  );
}