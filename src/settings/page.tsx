"use client";

import { exportMemory } from "@/lib/memoryExport";
import { importMemory } from "@/lib/memoryImport";
import { save } from "@/lib/db";

export default function SettingsPage() {

  async function handleImport(e: any) {
    const file = e.target.files[0];
    if (file) {
      await importMemory(file);
      alert("Memory imported");
    }
  }

  async function handleReset() {
    if (!confirm("Reset all data?")) return;

  // Reset known stores. Use the default key for user/memory and array for courses/errors
  await save("user", null, "main");
  await save("courses", [], "all");
  await save("errors", [], "all");
  await save("memory", null, "main");

    location.reload();
  }

  return (
    <div className="p-4 space-y-4">

      <h1 className="text-xl font-bold">Settings</h1>

      {/* EXPORT */}
      <button
        onClick={exportMemory}
        className="bg-blue-600 p-2 rounded w-full"
      >
        Export Memory
      </button>

      {/* IMPORT */}
      <input
        type="file"
        onChange={handleImport}
        className="w-full"
      />

      {/* RESET */}
      <button
        onClick={handleReset}
        className="bg-red-600 p-2 rounded w-full"
      >
        Reset All Data
      </button>

    </div>
  );
}