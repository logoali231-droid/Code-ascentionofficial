"use client";

import { runSandbox } from "../sandboxRunner";
import { Language } from "../engines";

export type TerminalLineType = "log" | "command" | "system" | "error" | "success";

export interface TerminalLine {
  id: string;
  type: TerminalLineType;
  content: string;
  timestamp: number;
}

export type CommandHandler = (
  args: string[],
  onLog: (content: string, type: TerminalLineType) => void
) => Promise<string | void>;

export class TerminalKernel {
  private commands = new Map<string, CommandHandler>();
  private onLogCallback: ((content: string, type: TerminalLineType) => void) | null = null;

  constructor() {
    this.registerLanguageExecutors();
  }

  setLogCallback(callback: (content: string, type: TerminalLineType) => void) {
    this.onLogCallback = callback;
  }

  register(name: string, handler: CommandHandler) {
    this.commands.set(name.toLowerCase(), handler);
  }

  private registerLanguageExecutors() {
    const runLanguageFile = async (
      lang: Language,
      args: string[],
      onLog: (content: string, type: TerminalLineType) => void
    ): Promise<string | void> => {
      const fileName = args[0];
      if (!fileName) {
        return `${lang}: informe o nome do arquivo para executar (ex: ${lang} main.ext)`;
      }

      try {
        // Resolve o caminho físico do diretório atual ativo do shell no OPFS
        const { currentPath } = await import("./terminalCommands");
        const root = await navigator.storage.getDirectory();
        let currentHandle = root;

        for (const dir of currentPath) {
          currentHandle = await currentHandle.getDirectoryHandle(dir);
        }

        const fileHandle = await currentHandle.getFileHandle(fileName);
        const fileData = await fileHandle.getFile();
        const code = await fileData.text();

        onLog(`[SHELL] Invoking unified execution pipeline for ${lang}...`, "system");

        // Instancia controle de cancelamento atômico para o ciclo de vida do processo
        const controller = new AbortController();

        // Dispara nativamente o código extraído dentro do motor isolado estável
        const result = await runSandbox(code, lang, controller.signal);

        if (result.error) {
          return `[EXECUTION ERROR] ${result.error}`;
        }
        return `[PROCESS EXIT SUCCESS]`;
      } catch (error: any) {
        return `exec: falha ao carregar ou executar '${fileName}': ${error.message}`;
      }
    };

    // Mapeamento explícito de comandos do pseudo-shell para engines do pipeline unificado
    const ENGINE_MAP: Record<string, Language> = {
  python: "python" as Language,
  python3: "python" as Language,
  node: "javascript" as Language,
  js: "javascript" as Language,
  javascript: "javascript" as Language,
  ts: "typescript" as Language,
  typescript: "typescript" as Language,
  bun: "typescript" as Language,
  deno: "typescript" as Language,
  bash: "bash" as Language,
  sh: "bash" as Language,
  gcc: "c" as Language,
  "g++": "cpp" as Language, // CORREÇÃO: Aspas previnem o parser de ler como operação aritmética g++
  java: "java" as Language,
  go: "go" as Language,
  rustc: "rust" as Language,
};

    Object.entries(ENGINE_MAP).forEach(([cmd, lang]) => {
  this.register(cmd, (args, onLog) => runLanguageFile(lang, args, onLog));
});
  }

  async execute(input: string): Promise < string | void> {
  const trimmed = input.trim();
  if(!trimmed) return;

  const [cmdRaw, ...args] = trimmed.split(/\s+/);
  const cmd = cmdRaw.toLowerCase();

  const handler = this.commands.get(cmd);

  const emitLog = (content: string, type: TerminalLineType) => {
    if (this.onLogCallback) {
      this.onLogCallback(content, type);
    }
  };

  if(!handler) {
    return `command not found: ${cmdRaw}`;
  }

    try {
    // Executa de forma isolada capturando falhas de runtime internas
    return await handler(args, emitLog);
  } catch(error: any) {
    emitLog(`[FATAL INTERRUPT] Internal command exception: ${error.message}`, "error");
    return `Internal execution failure.`;
  }
}
}

export const globalTerminalKernel = new TerminalKernel();