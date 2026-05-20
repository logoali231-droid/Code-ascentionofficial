"use client";

import { useState } from "react";
import { setSoundEnabled, isSoundEnabled, playSound } from "@/lib/others/sounds";

export default function SoundButton() {
  const [enabled, setEnabled] = useState(isSoundEnabled());

  function toggle() {
    const next = !enabled;

    setEnabled(next);
    setSoundEnabled(next);

    if (next) {
      playSound("click", 0.3);
    }
  }

  return (
    <button
      onClick={toggle}
      className="
        px-4 py-2 rounded-xl
        bg-zinc-900
        border border-zinc-700
        text-white
      "
    >
      {enabled ? "🔊 Sound ON" : "🔇 Sound OFF"}
    </button>
  );
}
