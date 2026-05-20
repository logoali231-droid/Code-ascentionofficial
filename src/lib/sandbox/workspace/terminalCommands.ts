"use client";

import { CommandHandler, TerminalLineType } from "./terminalKernel";

// Estado de diretório persistido em tempo de execução com tolerância a falhas
export let currentPath: string[] = [];

const STORAGE_CWD_KEY = "code_ascension_terminal_cwd";

// Restaura atomicamente o PWD anterior em caso de quebra de contexto do navegador
if (typeof window !== "undefined") {
  try {
    const savedPath = sessionStorage.getItem(STORAGE_CWD_KEY);
    if (savedPath) {
      currentPath = JSON.parse(savedPath);
    }
  } catch (e) {
    console.error("[Terminal Path Recovery] Falha ao recuperar CWD:", e);
  }
}

function updatePersistedPath(newPath: string[]) {
  currentPath = newPath;
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(STORAGE_CWD_KEY, JSON.stringify(newPath));
    } catch (e) {
      console.error("[Terminal Path Sync] Erro ao gravar CWD:", e);
    }
  }
}

export const terminalCommands: Record<string, CommandHandler> = {
  pwd: async (): Promise<string> => {
    return `/${currentPath.join("/")}`;
  },

  ls: async (): Promise<string> => {
    try {
      const root = await navigator.storage.getDirectory();
      let currentHandle = root;

      for (const dir of currentPath) {
        currentHandle = await currentHandle.getDirectoryHandle(dir);
      }

      const entries: string[] = [];
      for await (const [name, handle] of currentHandle.entries()) {
        const indicator = handle.kind === "directory" ? "/" : "";
        entries.push(`${name}${indicator}`);
      }

      return entries.length > 0 ? entries.join("\n") : "(diretório vazio)";
    } catch (error: any) {
      return `ls: erro ao ler o diretório: ${error.message}`;
    }
  },

  cd: async (args: string[]): Promise<string> => {
    const target = args[0];
    if (!target || target === "~") {
      updatePersistedPath([]);
      return "";
    }

    if (target === "..") {
      if (currentPath.length > 0) {
        const nextPath = [...currentPath];
        nextPath.pop();
        updatePersistedPath(nextPath);
      }
      return "";
    }

    const segments = target.split("/").filter((p) => p.length > 0);
    const initialPath = target.startsWith("/") ? [] : [...currentPath];
    const testPath = [...initialPath, ...segments];

    try {
      const root = await navigator.storage.getDirectory();
      let currentHandle = root;

      for (const dir of testPath) {
        currentHandle = await currentHandle.getDirectoryHandle(dir);
      }

      updatePersistedPath(testPath);
      return "";
    } catch {
      return `cd: o diretório não existe: ${target}`;
    }
  },

  mkdir: async (args: string[]): Promise<string> => {
    const folderName = args[0];
    if (!folderName) return "mkdir: informe o nome do diretório";

    try {
      const root = await navigator.storage.getDirectory();
      let currentHandle = root;

      for (const dir of currentPath) {
        currentHandle = await currentHandle.getDirectoryHandle(dir);
      }

      await currentHandle.getDirectoryHandle(folderName, { create: true });
      return "";
    } catch (error: any) {
      return `mkdir: falha ao criar diretório: ${error.message}`;
    }
  },

  cat: async (args: string[]): Promise<string> => {
    const fileName = args[0];
    if (!fileName) return "cat: informe o nome do arquivo";

    try {
      const root = await navigator.storage.getDirectory();
      let currentHandle = root;

      for (const dir of currentPath) {
        currentHandle = await currentHandle.getDirectoryHandle(dir);
      }

      const fileHandle = await currentHandle.getFileHandle(fileName);
      const file = await fileHandle.getFile();
      const content = await file.text();
      return content;
    } catch (error: any) {
      return `cat: ${fileName}: não foi possível ler o arquivo`;
    }
  },

  rm: async (args: string[]): Promise<string> => {
    const targetName = args[0];
    if (!targetName) return "rm: informe o alvo";

    try {
      const root = await navigator.storage.getDirectory();
      let currentHandle = root;

      for (const dir of currentPath) {
        currentHandle = await currentHandle.getDirectoryHandle(dir);
      }

      await currentHandle.removeEntry(targetName, { recursive: true });
      return "";
    } catch (error: any) {
      return `rm: falha ao deletar ${targetName}: ${error.message}`;
    }
  },
};