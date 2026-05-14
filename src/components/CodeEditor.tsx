"use client";

import {
  useState,
  useEffect,
  useMemo
} from "react";

import {
  resolveLanguage
} from "@/lib/editor/languageRegistry";

interface Props {
  language?: string;

  initialValue?: string;

  readOnly?: boolean;

  placeholder?: string;

  onChange?: (value: string) => void;
}

export default function CodeEditor({
  language = "plaintext",
  initialValue = "",
  readOnly = false,
  placeholder = "Write your code...",
  onChange
}: Props) {

  const [code, setCode] =
    useState(initialValue);

  useEffect(() => {
    setCode(initialValue || "");
  }, [initialValue]);

  const lang =
    useMemo(
      () => resolveLanguage(language),
      [language]
    );

  function insertText(
    textarea: HTMLTextAreaElement,
    text: string
  ) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const updated =
      code.substring(0, start) +
      text +
      code.substring(end);

    setCode(updated);

    if (onChange) {
      onChange(updated);
    }

    requestAnimationFrame(() => {
      textarea.selectionStart =
        textarea.selectionEnd =
          start + text.length;
    });
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) {

    const textarea = e.currentTarget;

    if (e.key === "Tab") {
      e.preventDefault();
      insertText(textarea, "  ");
    }

    if (e.key === "{") {
      e.preventDefault();
      insertText(textarea, "{}");
    }

    if (e.key === "(") {
      e.preventDefault();
      insertText(textarea, "()");
    }

    if (e.key === "[") {
      e.preventDefault();
      insertText(textarea, "[]");
    }

    if (e.key === '"') {
      e.preventDefault();
      insertText(textarea, '""');
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) {
    const value = e.target.value;

    setCode(value);

    if (onChange) {
      onChange(value);
    }
  }

  const lineCount =
    code.split("\n").length;

  return (
    <div
      className="
      w-full
      bg-[#050505]
      border
      border-cyan-500/10
      rounded-xl
      overflow-hidden
      shadow-[0_0_20px_rgba(0,255,255,0.03)]
    "
    >

      {/* HEADER */}

      <div
        className="
        flex
        items-center
        justify-between
        px-4
        py-2
        bg-[#0b0b0b]
        border-b
        border-white/5
      "
      >
        <div className="flex items-center gap-2">

          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />

          <span className="text-xs text-cyan-300 font-bold tracking-wider uppercase">
            {lang.label}
          </span>
        </div>

        <span className="text-[10px] text-slate-500">
          {lang.extension}
        </span>
      </div>

      {/* EDITOR */}

      <div className="flex">

        {/* LINE NUMBERS */}

        <div
          className="
          select-none
          text-right
          px-3
          py-4
          text-[12px]
          text-slate-600
          bg-[#080808]
          border-r
          border-white/5
          min-w-12.5
          font-mono
        "
        >
          {Array.from({
            length: lineCount
          }).map((_, i) => (
            <div
              key={i}
              className="leading-6"
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* TEXTAREA */}

        <textarea
          data-testid="code-editor"
          value={code}
          readOnly={readOnly}
          placeholder={placeholder}
          onKeyDown={handleKeyDown}
          onChange={handleChange}
          spellCheck={false}
          className="
          flex-1
          min-h-55
          bg-[#050505]
          text-cyan-100
          font-mono
          text-[13px]
          leading-6
          p-4
          resize-none
          outline-none
          custom-scrollbar
        "
        />
      </div>
    </div>
  );
}