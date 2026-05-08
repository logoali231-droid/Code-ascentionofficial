
"use client";

import { getMemory } from "./userMemory";
import { UserStats, CognitiveProfile } from "@/types/core";

/**
 * Calcula a dificuldade ideal para a próxima lição ou exercício
 * @param base Dificuldade base do curso/lição
 * @param topic Tópico atual (ex: 'react', 'typescript')
 * @param user Perfil do usuário vindo do banco
 */
export async function getAdaptiveDifficulty(
  base: number,
  topic: string,
  user: UserStats
): Promise<number> {
  const memory = await getMemory();
  let difficulty = base;

  // 1. ANÁLISE DE ERROS POR TÓPICO
  // Se o usuário errou muito este tópico específico recentemente, baixamos a barra
  const sameTopicErrors = memory.lastErrors?.filter(
    (e) => e.topic === topic
  ).length || 0;

  if (sameTopicErrors >= 2) difficulty -= 1;
  if (sameTopicErrors >= 5) difficulty -= 1;

  // 2. MAESTRIA (Streak de acertos)
  // Se o histórico recente mostra facilidade (acerto de primeira), subimos a dificuldade
  const recentHistory = memory.history?.slice(-3) || [];
  
  if (recentHistory.length >= 3) {
    const perfectStreak = recentHistory.every(
      (h) => h.success === true && h.attempts <= 1
    );
    
    if (perfectStreak) {
      difficulty += 1;
    }
  }

  // 3. SKILL GROWTH (Baseado no XP acumulado)
  // Níveis baseados na progressão do Core (XP/1000 por exemplo, ou direto do nível calculado)
  const userLevel = Math.floor(user.xp / 1000) + 1; 
  if (userLevel > 5) difficulty += 1;
  if (userLevel > 15) difficulty += 1;

  // 4. COGNITIVE TUNING (Sincronizado com core.ts)
  // "tdah": Reduzimos o teto de dificuldade para manter o engajamento sem frustração
  // "Deep_Dive": Forçamos um desafio maior
  const profile: CognitiveProfile = user.cognitive;

  if (profile === "tdah") {
    difficulty = Math.min(difficulty, 3); 
  } 
  
  if (profile === "Deep_Dive") {
    difficulty += 1;
  }

  // 5. AJUSTE DE "FADIGA"
  // Evita burnout: se o usuário já estudou muito hoje, suavizamos a carga
  if (memory.history && memory.history.length > 0) {
    const todayStr = new Date().toDateString();
    const sessionsToday = memory.history.filter((h) => 
      new Date(h.timestamp).toDateString() === todayStr
    ).length;

    if (sessionsToday > 12) {
      difficulty -= 1;
    }
  }

  // Clamping: Garante que o resultado esteja no range 1-5 (Sistema de Estrelas/Raridade)
  return Math.max(1, Math.min(5, difficulty));
}