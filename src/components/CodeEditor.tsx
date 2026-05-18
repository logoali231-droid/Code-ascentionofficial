"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Language } from "@/lib/sandbox/types";
import prism from "prismjs";

// Importações básicas do Prism para suporte estático e leve
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-sql";

interface Props {
  language?: Language | "plaintext";
  initialValue?: string;
  readOnly?: boolean;
  placeholder?: string;
  onChange?: (value: string) => void;
}

const CLOSURE_PAIRS: Record<string, string> = {
  "{": "}",
  "(": ")",
  "[": "]",
  '"': '"',
};

export default function CodeEditor({
  language = "plaintext",
  initialValue = "",
  readOnly = false,
  placeholder = "Write your code...",
  onChange,
}: Props) {
  const [code, setCode] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    setCode(initialValue || "");
  }, [initialValue]);

  // Sincroniza o scroll do textarea invisível com o container de realce visual
  const handleScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const langInfo = useMemo(() => {
    if (language === "plaintext")
      return { label: "PLAINTEXT", ext: ".txt", prismLang: "plaintext" };

    const label = language.toUpperCase();
    let ext = ".txt";
    let prismLang = "clike";

    switch (language) {
      case "python":
        ext = ".py";
        prismLang = "python";
        break;
      case "javascript":
        ext = ".js";
        prismLang = "javascript";
        break;
      case "java":
        ext = ".java";
        prismLang = "java";
        break;
      case "typescript":
        ext = ".ts";
        prismLang = "typescript";
        break;
      case "csharp":
        ext = ".cs";
        prismLang = "csharp";
        break;
      case "html":
        ext = ".html";
        prismLang = "html";
        break;
      case "cpp":
        ext = ".cpp";
        prismLang = "cpp";
        break;
      case "go":
        ext = ".go";
        prismLang = "go";
        break;
      case "rust":
        ext = ".rs";
        prismLang = "rust";
        break;
      case "php":
        ext = ".php";
        prismLang = "php";
        break;
      case "lua":
        ext = ".lua";
        prismLang = "lua";
        break;
      case "ruby":
        ext = ".rb";
        prismLang = "ruby";
        break;
      case "kotlin":
      case "kotlin-native":
        ext = ".kt";
        prismLang = "kotlin";
        break;
      case "scala":
        ext = ".sc";
        prismLang = "scala";
        break;
      case "shell":
      case "powershell":
        ext = ".sh";
        prismLang = "bash";
        break;
      case "solidity":
        ext = ".sol";
        prismLang = "clike";
        break;
      case "sql":
      case "plsql":
        ext = ".sql";
        prismLang = "sql";
        break;
      default: {
        const langStr = language as string;
        ext = `.${langStr.split("-")[0].slice(0, 3)}`;
        prismLang = "clike";
      }
    }

    return { label, ext, prismLang };
  }, [language]);

  // Tokenização estática imediata sem checagem de erros do compilador
  const highlightedCode = useMemo(() => {
    const grammars =
      prism.languages[langInfo.prismLang] || prism.languages.clike;
    if (langInfo.prismLang === "plaintext" || !grammars) {
      return code;
    }
    return prism.highlight(code, grammars, langInfo.prismLang);
  }, [code, langInfo.prismLang]);

  function insertText(textarea: HTMLTextAreaElement, open: string, close = "") {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const inserted = open + close;
    const updated = code.substring(0, start) + inserted + code.substring(end);

    setCode(updated);
    if (onChange) onChange(updated);

    requestAnimationFrame(() => {
      textarea.selectionStart = textarea.selectionEnd = start + open.length;
      handleScroll();
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
          <span className="text-xs text-cyan-300 font-bold tracking-wider uppercase">
            {langInfo.label}
          </span>
        </div>
        <span className="text-[10px] text-slate-500">{langInfo.ext}</span>
      </div>

      <div className="flex relative">
        {/* Linhas indicadoras laterais */}
        <div className="select-none text-right px-3 py-4 text-[13px] text-slate-600 bg-[#080808] border-r border-white/5 min-w-12 z-20">
          {lines.map((_, i) => (
            <div key={i} className="leading-6">
              {i + 1}
            </div>
          ))}
        </div>

        <div className="flex-1 relative min-h-55 bg-[#050505]">
          {/* Camada inferior: Código colorido via Prism com a paleta Cyberpunk */}
          <pre
            ref={preRef}
            aria-hidden="true"
            className="absolute inset-0 p-4 m-0 pointer-events-none text-[13px] leading-6 overflow-hidden whitespace-pre font-mono z-10 token-cyberpunk"
            dangerouslySetInnerHTML={{ __html: highlightedCode }}
          />

          {/* Camada superior: Área de input transparente mapeada 1:1 */}
          <textarea
            ref={textareaRef}
            data-testid="code-editor"
            value={code}
            readOnly={readOnly}
            placeholder={placeholder}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            onChange={(e) => {
              setCode(e.target.value);
              if (onChange) onChange(e.target.value);
            }}
            spellCheck={false}
            className="absolute inset-0 w-full h-full bg-transparent text-transparent caret-cyan-400 text-[13px] leading-6 p-4 resize-none outline-none custom-scrollbar font-mono z-10"
          />
        </div>
      </div>

      {/* CSS embutido para tokens estéticos cyberpunk sem poluir arquivos externos */}
      <style jsx global>{`
        .token-cyberpunk .token.keyword {
          color: #ff0055;
          font-weight: bold;
        }
        .token-cyberpunk .token.string {
          color: #00ff88;
        }
        .token-cyberpunk .token.function {
          color: #00f2ff;
        }
        .token-cyberpunk .token.number {
          color: #facc15;
        }
        .token-cyberpunk .token.comment {
          color: #475569;
          font-style: italic;
        }
        .token-cyberpunk .token.operator {
          color: #c026d3;
        }
        .token-cyberpunk .token.class-name {
          color: #a78bfa;
        }
        .token-cyberpunk .token.boolean {
          color: #facc15;
        }
      `}</style>
    </div>
  );
}
