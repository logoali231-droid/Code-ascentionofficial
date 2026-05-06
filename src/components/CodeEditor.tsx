"use client";

import { useState, useEffect } from "react";

export default function CodeEditor({ onChange, initialValue = "" }: any) {
  const [code, setCode] = useState(initialValue);

  // keep code synced if parent changes initialValue
  useEffect(() => {
    setCode(initialValue || "");
  }, [initialValue]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();

      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;

      const newValue =
        code.substring(0, start) + "  " + code.substring(end);

      setCode(newValue);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  }

  function handleChange(e: any) {
    const v = e.target.value;
    setCode(v);
    if (onChange) onChange(v);
  }

  return (
    <textarea
      data-testid="code-editor"
      value={code}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder="Write your code..."
      className="w-full h-40 p-3 bg-black text-green-400 font-mono rounded"
    />
  );
}
