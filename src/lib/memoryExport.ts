"use client";

import { db } from "./db";

/**
 * Realiza o backup completo do estado do usuário.
 * Consolida UserStats, Cursos, Erros e Memória em um único JSON.
 */
export async function exportMemory() {
  // Coleta todos os dados das stores do Dexie em paralelo
  const [user, courses, errors, memory] = await Promise.all([
    db.user.get("main"),
    db.courses.toArray(),
    db.errors.toArray(),
    db.memory.get("main")
  ]);

  const backupData = {
    version: "1.1",
    timestamp: new Date().toISOString(),
    payload: { user, courses, errors, memory }
  };

  const blob = new Blob([JSON.stringify(backupData, null, 2)], {
    type: "application/json",
  });

  // Fluxo de download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `code-ascension-backup-${Date.now()}.json`;
  
  document.body.appendChild(a); // Garantia para navegadores mobile (M23)
  a.click();
  
  // Cleanup
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
