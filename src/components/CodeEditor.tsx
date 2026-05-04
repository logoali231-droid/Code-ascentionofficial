"use client";

import { useState } from "react";

export default function CodeEditor({ onChange }: any) {
  const [code, setCode] = useState("");

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
    setCode(e.target.value);
    onChange(e.target.value);
  }

  return (
    <textarea
      value={code}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder="Write your code..."
      className="w-full h-40 p-3 bg-black text-green-400 font-mono rounded"
    />
  );
}