/**
 * src/lib/adaptive.ts
 * Implementação de Dificuldade Adaptativa Profunda
 */
"use client";

import { getMemory } from "./userMemory";

export async function getAdaptiveDifficulty(
  base: number,
  topic: string,
  user: any
) {
  const memory = await getMemory();
  let difficulty = base;

  // 1. ANÁLISE DE ERROS POR TÓPICO
  const sameTopicErrors = memory.lastErrors?.filter(
    (e: any) => e.topic === topic
  ).length || 0;

  if (sameTopicErrors >= 2) difficulty -= 1; 
  if (sameTopicErrors >= 5) difficulty -= 1; // Redução progressiva

  // 2. MAESTRIA (Streak de acertos)
  // Se as últimas 3 interações foram acertos sem erro, sobe a barra
  const recentHistory = memory.history?.slice(-3) || [];
  const perfectStreak = recentHistory.every((h: any) => h.success === true && h.attempts === 1);
  
  if (perfectStreak && recentHistory.length >= 3) {
    difficulty += 1;
  }

  // 3. SKILL GROWTH (XP e Nível)
  const level = user?.level || 1;
  if (level > 5) difficulty += 1;
  if (level > 15) difficulty += 1;

  // 4. COGNITIVE TUNING (Perfil de Aprendizado)
  // ADHD: Menos carga cognitiva por vez, dificuldade técnica menor, mas mais variedade.
  // DEEP DIVE: Busca o limite técnico mais rápido.
  if (user?.cognitiveProfile === "ADHD_Focus") {
    difficulty = Math.min(difficulty, 3); // Cap de dificuldade para evitar frustração
  } 
  
  if (user?.cognitiveProfile === "Deep_Dive") {
    difficulty += 1;
  }

  // 5. AJUSTE DE "FADIGA" (Baseado no tempo de sessão)
  // Se o usuário já fez mais de 10 exercícios hoje, reduzimos levemente a complexidade
  const sessionsToday = memory.history?.filter((h: any) => {
    const isToday = new Date(h.timestamp).toDateString() === new Date().toDateString();
    return isToday;
  }).length || 0;

  if (sessionsToday > 10) {
    difficulty -= 1;
  }

  // Garante que fique entre 1 (Iniciante) e 5 (Expert)
  return Math.max(1, Math.min(5, difficulty));
}