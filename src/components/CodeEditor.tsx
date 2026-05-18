"use client";

import { useState, useEffect, useMemo } from "react";
import { Language } from "@/lib/sandbox/types";

interface Props {
  language?: Language | "plaintext";
  initialValue?: string;
  readOnly?: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
}

const CLOSURE_PAIRS: Record<string, string> = {
  "{": "}", "(": ")", "[": "]", '"': '"'
};

export default function CodeEditor({
  language = "plaintext",
  initialValue = "",
  readOnly = false,
  placeholder = "Write your code...",
  onChange
}: Props) {
  const [code, setCode] = useState(initialValue);

  useEffect(() => {
    setCode(initialValue || "");
  }, [initialValue]);

  const langInfo = useMemo(() => {
    if (language === "plaintext") return { label: "PLAINTEXT", ext: ".txt" };
    
    const label = language.toUpperCase();
    let ext = ".txt";

    // Mapeamento dinâmico e preciso para extensões do ecossistema global de linguagens
    switch (language) {
      case "javascript": ext = ".js"; break;
      case "typescript": ext = ".ts"; break;
      case "python": ext = ".py"; break;
      case "csharp": ext = ".cs"; break;
      case "c++": case "cpp": ext = ".cpp"; break;
      case "html": ext = ".html"; break;
      case "rust": ext = ".rs"; break;
      case "golang": case "go": ext = ".go"; break;
      case "ruby": ext = ".rb"; break;
      case "kotlin": case "kotlin-native": ext = ".kt"; break;
      case "shell": case "powershell": ext = ".sh"; break;
      case "solidity": ext = ".sol"; break;
      case "actionscript": ext = ".as"; break;
      default:
        // Fallback inteligente para siglas de 3 letras (php, lua, sql, vhdl, asm, swift, etc)
        ext = `.${language.split("-")[0].slice(0, 3)}`;
    }

    return { label, ext };
  }, [language]);

  function insertText(textarea: HTMLTextAreaElement, open: string, close = "") {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const inserted = open + close;
    const updated = code.substring(0, start) + inserted + code.substring(end);

    setCode(updated);
    if (onChange) onChange(updated);

    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + open.length;
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const textarea = e.currentTarget;

    if (e.key === "Tab") {
      e.preventDefault();
      insertText(textarea, "  ");
      return;
    }

    if (CLOSURE_PAIRS[e.key]) {
      e.preventDefault();
      insertText(textarea, e.key, CLOSURE_PAIRS[e.key]);
    }
  }

  const lines = code.split("\n");

  return (
    <div className="w-full bg-[#050505] border border-cyan-500/10 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(0,255,255,0.03)] font-mono">
      <div className="flex items-center justify-between px-4 py-2 bg-[#0b0b0b] border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs text-cyan-300 font-bold tracking-wider uppercase">{langInfo.label}</span>
        </div>
        <span className="text-[10px] text-slate-500">{langInfo.ext}</span>
      </div>

      <div className="flex">
        <div className="select-none text-right px-3 py-4 text-[12px] text-slate-600 bg-[#080808] border-r border-white/5 min-w-12">
          {lines.map((_, i) => (
            <div key={i} className="leading-6">{i + 1}</div>
          ))}
        </div>

        <textarea
          data-testid="code-editor"
          value={code}
          readOnly={readOnly}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            setCode(e.target.value);
            if (onChange) onChange(e.target.value);
          }}
          spellCheck={false}
          className="flex-1 min-h-55 bg-[#050505] text-cyan-100 text-[13px] leading-6 p-4 resize-none outline-none custom-scrollbar"
        />
      </div>
    </div>
  );
}
