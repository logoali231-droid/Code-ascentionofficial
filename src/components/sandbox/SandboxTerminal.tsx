"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Terminal, Trash2, ChevronRight, Cpu, Activity, RefreshCw } from "lucide-react";
import { globalTerminalKernel, TerminalLine, TerminalLineType } from "@/lib/sandbox/workspace/terminalKernel";
import { terminalCommands } from "@/lib/sandbox/workspace/terminalCommands";

interface Props {
  logs: string[];
}

const BUILT_IN_COMMANDS = [
  "help", "clear", "date", "echo", "about", "whoami", "memory", 
  "status", "ping", "version", "neofetch", "pwd", "ls", "cd", 
  "mkdir", "cat", "rm", "python", "node", "bash"
];

const STORAGE_HISTORY_KEY = "code_ascension_terminal_history_lines";
const STORAGE_CMD_INPUT_KEY = "code_ascension_terminal_command_inputs";

export default function SandboxTerminal({ logs }: Props) {
  const [history, setHistory] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isExecuting, setIsExecuting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* =========================================================
     RECUPERAÇÃO DE SESSÃO PÓS-CRASH
  ========================================================= */
  useEffect(() => {
    try {
      const savedHistory = sessionStorage.getItem(STORAGE_HISTORY_KEY);
      const savedCmds = sessionStorage.getItem(STORAGE_CMD_INPUT_KEY);

      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      } else {
        setHistory([
          {
            id: crypto.randomUUID(),
            type: "system",
            content: "Neural Pseudo-Shell v3.2 initialized successfully.",
            timestamp: Date.now(),
          },
          {
            id: crypto.randomUUID(),
            type: "system",
            content: "Type 'help' to list available system and file utilities.",
            timestamp: Date.now(),
          },
        ]);
      }

      if (savedCmds) {
        setCommandHistory(JSON.parse(savedCmds));
      }
    } catch (error) {
      console.error("[Terminal Session Restore] Falha ao ler fila de recuperação:", error);
    }

    // Registra comandos dinâmicos baseados no OPFS dentro do Kernel centralizador
    Object.entries(terminalCommands).forEach(([name, handler]) => {
      globalTerminalKernel.register(name, handler);
    });
  }, []);

  // Sincroniza snapshots a cada alteração nas linhas em tela
  useEffect(() => {
    if (history.length > 0) {
      try {
        sessionStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
      } catch (e) {
        console.error("[Terminal Backup] Falha ao persistir linhas:", e);
      }
    }
  }, [history]);

  useEffect(() => {
    if (commandHistory.length > 0) {
      try {
        sessionStorage.setItem(STORAGE_CMD_INPUT_KEY, JSON.stringify(commandHistory));
      } catch (e) {
        console.error("[Terminal Backup] Falha ao persistir comandos:", e);
      }
    }
  }, [commandHistory]);

  /* =========================================================
     INTERCEPTOR DE STREAM E CALLBACKS DO KERNEL
  ========================================================= */
  useEffect(() => {
    globalTerminalKernel.setLogCallback((content: string, type: TerminalLineType) => {
      pushLine(type, content);
    });
  }, []);

  /* =========================================================
     STREAM DE LOGS EXTERNOS (PAINEL DO EDITOR COGNITIVO)
  ========================================================= */
  useEffect(() => {
    if (!logs.length) return;
    const latest = logs[logs.length - 1];

    setHistory((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].content === latest) return prev;
      return [
        ...prev,
        {
          id: crypto.randomUUID(),
          type: latest.includes("ERR") || latest.includes("CRASH") ? "error" : "log",
          content: latest,
          timestamp: Date.now(),
        },
      ];
    });
  }, [logs]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [history]);

  function pushLine(type: TerminalLine["type"], content: string) {
    setHistory((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type,
        content,
        timestamp: Date.now(),
      },
    ]);
  }

  async function executeCommand(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;

    setIsExecuting(true);
    pushLine("command", `> ${trimmed}`);

    const parts = trimmed.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Utilitários de manipulação direta da UI local
    if (command === "clear") {
      setHistory([]);
      sessionStorage.removeItem(STORAGE_HISTORY_KEY);
      setIsExecuting(false);
      return;
    }

    if (command === "help") {
      pushLine("success", BUILT_IN_COMMANDS.join(" | "));
      setIsExecuting(false);
      return;
    }

    if (command === "echo") {
      pushLine("log", args.join(" "));
      setIsExecuting(false);
      return;
    }

    if (command === "date") {
      pushLine("log", new Date().toString());
      setIsExecuting(false);
      return;
    }

    if (command === "whoami") {
      pushLine("success", "code-ascension::operator");
      setIsExecuting(false);
      return;
    }

    if (command === "about") {
      pushLine("log", "Hybrid Neural Sandbox Runtime Shell");
      pushLine("log", "Local + WASM + Remote + Neural Cores connected.");
      setIsExecuting(false);
      return;
    }

    if (command === "status") {
      pushLine("success", "SYSTEM STATUS: ACTIVE & FAULT TOLERANT");
      if ((performance as any).memory) {
        const mem = ((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
        pushLine("log", `Memory Heap Consumption: ${mem} MB`);
      }
      setIsExecuting(false);
      return;
    }

    if (command === "memory") {
      if ((performance as any).memory) {
        const mem = ((performance as any).memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
        pushLine("log", `JS Heap Usage: ${mem} MB`);
      } else {
        pushLine("error", "Memory Performance API unsupported in this browser engine.");
      }
      setIsExecuting(false);
      return;
    }

    if (command === "ping") {
      pushLine("success", "PONG :: IPC channel active <1ms");
      setIsExecuting(false);
      return;
    }

    if (command === "version") {
      pushLine("log", "Sandbox Terminal Runtime Engine v3.2.0");
      setIsExecuting(false);
      return;
    }

    if (command === "neofetch") {
      pushLine("success", "Code Ascension Operational System");
      pushLine("log", "Kernel: Polymorphic Hybrid Architecture");
      pushLine("log", `Platform Node: ${navigator.platform}`);
      pushLine("log", `Hardware Cores: ${navigator.hardwareConcurrency || "Unknown"}`);
      pushLine("log", `RAM Allocation: ${(navigator as any).deviceMemory || "?"} GB`);
      setIsExecuting(false);
      return;
    }

    // BLINDAGEM CENTRALIZADA CONTRA CONGELAMENTO DE UI E FALHAS DE TRHEAD (WebWorker/WebGPU Lost)
    try {
      const output = await globalTerminalKernel.execute(trimmed);
      
      if (output) {
        if (output.startsWith("[EXECUTION ERROR]") || output.startsWith("ls:") || output.startsWith("cd:") || output.startsWith("cat:") || output.startsWith("mkdir:") || output.startsWith("rm:")) {
          pushLine("error", output);
        } else if (output.startsWith("[PROCESS EXIT SUCCESS]")) {
          pushLine("success", output);
        } else {
          pushLine("log", output);
        }
      }
    } catch (err: any) {
      pushLine("error", `[CRITICAL HARDWARE FAULT] Browser sandbox thread disrupted or context lost.`);
      pushLine("error", `Details: ${err.message || "Out of Memory (OOM) or termination constraint."}`);
    } finally {
      // Força a liberação da trava do terminal em 100% dos cenários catastróficos
      setIsExecuting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (isExecuting) {
      if (e.key === "Enter") e.preventDefault();
      return;
    }

    if (e.key === "Enter") {
      const currentInput = input;
      setInput("");
      executeCommand(currentInput);

      if (currentInput.trim()) {
        setCommandHistory((prev) => [currentInput, ...prev]);
      }
      setHistoryIndex(-1);
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = historyIndex + 1;
      if (next < commandHistory.length) {
        setHistoryIndex(next);
        setInput(commandHistory[next]);
      }
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = historyIndex - 1;
      if (next >= 0) {
        setHistoryIndex(next);
        setInput(commandHistory[next]);
      } else {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  }

  const stats = useMemo(() => {
    return {
      lines: history.length,
      commands: history.filter((h) => h.type === "command").length,
    };
  }, [history]);

  function clearSessionStorageBackup() {
    setHistory([]);
    setCommandHistory([]);
    try {
      sessionStorage.removeItem(STORAGE_HISTORY_KEY);
      sessionStorage.removeItem(STORAGE_CMD_INPUT_KEY);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="flex flex-col h-72 bg-[#050505] border-t border-cyan-950/30 overflow-hidden relative">
      {/* HEADER CONTROLLER */}
      <div className="h-10 px-4 border-b border-white/5 flex items-center justify-between bg-[#080808] shrink-0 select-none">
        <div className="flex items-center gap-3">
          <Terminal size={14} className="text-cyan-400" />
          <span className="text-[10px] tracking-[0.25em] text-cyan-400 font-black uppercase">
            Neural Pseudo-Shell v3.2
          </span>
          {isExecuting && (
            <div className="flex items-center gap-1.5 ml-2">
              <RefreshCw size={10} className="text-amber-400 animate-spin" />
              <span className="text-[9px] font-mono text-amber-400/80 uppercase tracking-wider">Running Pipeline...</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono">
          <div className="flex items-center gap-1" title="Histórico de Linhas">
            <Activity size={11} className="text-slate-600" />
            {stats.lines}
          </div>

          <div className="flex items-center gap-1" title="Comandos Executados">
            <Cpu size={11} className="text-slate-600" />
            {stats.commands}
          </div>

          <button
            onClick={clearSessionStorageBackup}
            title="Limpar terminal e descartar snapshot de sessão"
            className="hover:text-red-400 transition-colors p-1 rounded hover:bg-white/5"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* OUTPUT BUFFER PANEL */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-[12px] custom-scrollbar select-text selection:bg-cyan-500/20"
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((line) => (
          <div key={line.id} className="flex gap-3 mb-1 leading-5 items-start">
            <span className="text-slate-700 select-none w-16 shrink-0 text-[11px] pt-0.5">
              {new Date(line.timestamp).toLocaleTimeString()}
            </span>

            <span
              className={`whitespace-pre-wrap break-all ${
                line.type === "error"
                  ? "text-red-400 font-semibold"
                  : line.type === "success"
                  ? "text-emerald-400 font-medium"
                  : line.type === "command"
                  ? "text-cyan-400 font-bold"
                  : line.type === "system"
                  ? "text-fuchsia-400"
                  : "text-slate-300"
              }`}
            >
              {line.content}
            </span>
          </div>
        ))}
      </div>

      {/* PROMPT ACTION INPUT */}
      <div className="h-12 border-t border-white/5 bg-[#080808] flex items-center px-3 shrink-0">
        <ChevronRight size={16} className={`mr-2 ${isExecuting ? "text-slate-600 animate-pulse" : "text-cyan-400"}`} />

        <input
          ref={inputRef}
          value={input}
          disabled={isExecuting}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={isExecuting ? "Pipeline busy executing process..." : "Enter command (ex: ls, cd, python app.py)..."}
          className="flex-1 bg-transparent outline-none text-cyan-300 font-mono text-[12px] placeholder:text-slate-600 disabled:text-slate-500 disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}