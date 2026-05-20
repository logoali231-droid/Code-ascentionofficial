"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Terminal,
  Trash2,
  ChevronRight,
  Cpu,
  Activity,
} from "lucide-react";

interface Props {
  logs: string[];
}

type TerminalLine = {
  id: string;
  type:
    | "log"
    | "command"
    | "system"
    | "error"
    | "success";
  content: string;
  timestamp: number;
};

const BUILT_IN_COMMANDS = [
  "help",
  "clear",
  "date",
  "echo",
  "about",
  "whoami",
  "memory",
  "status",
  "ping",
  "version",
  "neofetch",
];

export default function SandboxTerminal({
  logs,
}: Props) {
  const [history, setHistory] = useState<
    TerminalLine[]
  >([]);

  const [input, setInput] =
    useState("");

  const [commandHistory, setCommandHistory] =
    useState<string[]>([]);

  const [historyIndex, setHistoryIndex] =
    useState(-1);

  const scrollRef =
    useRef<HTMLDivElement>(null);

  const inputRef =
    useRef<HTMLInputElement>(null);

  /* =========================================================
     EXTERNAL LOG STREAM
  ========================================================= */

  useEffect(() => {
    if (!logs.length) {
      return;
    }

    const latest =
      logs[logs.length - 1];

    setHistory((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        type: latest.includes("ERR")
          ? "error"
          : "log",
        content: latest,
        timestamp: Date.now(),
      },
    ]);
  }, [logs]);

  /* =========================================================
     AUTO SCROLL
  ========================================================= */

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top:
        scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [history]);

  /* =========================================================
     BOOT SEQUENCE
  ========================================================= */

  useEffect(() => {
    setHistory([
      {
        id: crypto.randomUUID(),
        type: "system",
        content:
          "Neural Runtime Terminal v3.2 initialized",
        timestamp: Date.now(),
      },
      {
        id: crypto.randomUUID(),
        type: "system",
        content:
          "Type 'help' to list available commands.",
        timestamp: Date.now(),
      },
    ]);
  }, []);

  /* =========================================================
     COMMAND ENGINE
  ========================================================= */

  function pushLine(
    type: TerminalLine["type"],
    content: string,
  ) {
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

  async function executeCommand(
    raw: string,
  ) {
    const trimmed = raw.trim();

    if (!trimmed) {
      return;
    }

    pushLine(
      "command",
      `> ${trimmed}`,
    );

    const [
      command,
      ...args
    ] = trimmed.split(" ");

    switch (
      command.toLowerCase()
    ) {
      case "help":
        pushLine(
          "success",
          BUILT_IN_COMMANDS.join(
            " | ",
          ),
        );
        break;

      case "clear":
        setHistory([]);
        break;

      case "echo":
        pushLine(
          "log",
          args.join(" "),
        );
        break;

      case "date":
        pushLine(
          "log",
          new Date().toString(),
        );
        break;

      case "whoami":
        pushLine(
          "success",
          "code-ascension::operator",
        );
        break;

      case "about":
        pushLine(
          "log",
          "Hybrid Neural Sandbox Runtime",
        );

        pushLine(
          "log",
          "Local + WASM + Remote + Neural",
        );
        break;

      case "status":
        pushLine(
          "success",
          "SYSTEM STATUS: STABLE",
        );

        pushLine(
          "log",
          `Memory Heap: ${
            (
              (performance as any).memory?.usedJSHeapSize
                ?.usedJSHeapSize /
              1024 /
              1024
            ).toFixed(2) || "N/A"
          } MB`,
        );

        break;

      case "memory":
        if (
          (performance as any).memory
        ) {
          const mem =
            (
              (
                performance as any
              ).memory
                .usedJSHeapSize /
              1024 /
              1024
            ).toFixed(2);

          pushLine(
            "log",
            `JS Heap Usage: ${mem} MB`,
          );
        } else {
          pushLine(
            "error",
            "Memory API unsupported.",
          );
        }

        break;

      case "ping":
        pushLine(
          "success",
          "PONG :: latency <1ms",
        );
        break;

      case "version":
        pushLine(
          "log",
          "Sandbox Runtime 3.2.0",
        );
        break;

      case "neofetch":
        pushLine(
          "success",
          "Code Ascension Runtime",
        );

        pushLine(
          "log",
          "Kernel: Neural Hybrid",
        );

        pushLine(
          "log",
          `Platform: ${navigator.platform}`,
        );

        pushLine(
          "log",
          `Cores: ${
            navigator.hardwareConcurrency
          }`,
        );

        pushLine(
          "log",
          `RAM: ${
            (
              (
                navigator as any
              ).deviceMemory || "?"
            )
          } GB`,
        );

        break;

      default:
        pushLine(
          "error",
          `Unknown command: ${command}`,
        );
    }
  }

  /* =========================================================
     KEYBOARD ENGINE
  ========================================================= */

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Enter") {
      executeCommand(input);

      setCommandHistory(
        (prev) => [
          input,
          ...prev,
        ],
      );

      setHistoryIndex(-1);

      setInput("");
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();

      const next =
        historyIndex + 1;

      if (
        next <
        commandHistory.length
      ) {
        setHistoryIndex(next);

        setInput(
          commandHistory[next],
        );
      }
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();

      const next =
        historyIndex - 1;

      if (next >= 0) {
        setHistoryIndex(next);

        setInput(
          commandHistory[next],
        );
      } else {
        setHistoryIndex(-1);

        setInput("");
      }
    }
  }

  const stats = useMemo(() => {
    return {
      lines: history.length,
      commands:
        history.filter(
          (h) =>
            h.type ===
            "command",
        ).length,
    };
  }, [history]);

  return (
    <div className="flex flex-col h-72 bg-[#050505] border-t border-cyan-950/30 overflow-hidden">
      {/* HEADER */}
      <div className="h-10 px-4 border-b border-white/5 flex items-center justify-between bg-[#080808] shrink-0">
        <div className="flex items-center gap-3">
          <Terminal
            size={14}
            className="text-cyan-400"
          />

          <span className="text-[10px] tracking-[0.25em] text-cyan-400 font-black uppercase">
            Neural Terminal
          </span>
        </div>

        <div className="flex items-center gap-4 text-[10px] text-slate-500">
          <div className="flex items-center gap-1">
            <Activity size={11} />
            {stats.lines}
          </div>

          <div className="flex items-center gap-1">
            <Cpu size={11} />
            {stats.commands}
          </div>

          <button
            onClick={() =>
              setHistory([])
            }
            className="hover:text-red-400 transition-colors"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* OUTPUT */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 font-mono text-[12px] custom-scrollbar"
        onClick={() =>
          inputRef.current?.focus()
        }
      >
        {history.map((line) => (
          <div
            key={line.id}
            className="flex gap-3 mb-1 leading-5"
          >
            <span className="text-slate-700 select-none w-16 shrink-0">
              {new Date(
                line.timestamp,
              ).toLocaleTimeString()}
            </span>

            <span
              className={
                line.type === "error"
                  ? "text-red-400"
                  : line.type ===
                    "success"
                    ? "text-emerald-400"
                    : line.type ===
                      "command"
                      ? "text-cyan-400"
                      : line.type ===
                        "system"
                        ? "text-fuchsia-400"
                        : "text-slate-300"
              }
            >
              {line.content}
            </span>
          </div>
        ))}
      </div>

      {/* INPUT */}
      <div className="h-12 border-t border-white/5 bg-[#080808] flex items-center px-3 shrink-0">
        <ChevronRight
          size={16}
          className="text-cyan-400 mr-2"
        />

        <input
          ref={inputRef}
          value={input}
          onChange={(e) =>
            setInput(
              e.target.value,
            )
          }
          onKeyDown={handleKeyDown}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Enter command..."
          className="flex-1 bg-transparent outline-none text-cyan-300 font-mono text-[12px] placeholder:text-slate-600"
        />
      </div>
    </div>
  );
}