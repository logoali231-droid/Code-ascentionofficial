"use client";

import { getMemory } from "./userMemory";

export async function exportMemory() {
  const mem = await getMemory();

  const blob = new Blob([JSON.stringify(mem, null, 2)], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "memory-backup.json";
  a.click();

  URL.revokeObjectURL(url);
}