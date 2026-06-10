"use client";

import { useEffect, useState } from "react";

export default function DevModeToggle() {
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setEnabled(localStorage.getItem("dev-mode") === "true");
  }, []);

  if (!mounted) return null;

  function toggle() {
    const next = !enabled;

    localStorage.setItem("dev-mode", String(next));
    window.location.reload();
  }

  return (
    <label
      className="
        fixed
        top-4
        right-4
        z-[999999]
        flex
        items-center
        gap-2
        rounded-lg
        border
        border-cyan-500
        bg-slate-950
        px-3
        py-2
        text-xs
      "
    >
      DEV

      <input
        type="checkbox"
        checked={enabled}
        onChange={toggle}
      />
    </label>
  );
}