"use client";

import { exportMemory } from "@/lib/memoryExport";
import { importMemory } from "@/lib/memoryImport";
import { save, db } from "@/lib/db";

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

  try {
    // Reset do usuário para o estado inicial
    await db.user.put({ id: 'main', xp: 0, coins: 0 }); 
    
    // Limpeza completa das tabelas
    await db.courses.clear(); 
    await db.errors.clear();
    
    // Reset da memória neural
    await db.memory.put({ id: 'main', data: [] });

    window.location.reload(); 
  } catch (error) {
    console.error("Falha ao resetar banco de dados:", error);
  }
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
