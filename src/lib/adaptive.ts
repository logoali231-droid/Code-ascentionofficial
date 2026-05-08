"use client";

import { db, getUser } from "./db";
import { UserStats, CognitiveProfile } from "@/types/core"; 

interface RewardMultiplier {
  xpMultiplier: number;
  coinMultiplier: number;
  difficulty: number;
}

/**
 * Calcula métricas adaptativas baseadas no histórico real do IndexedDB
 * e no perfil cognitivo do utilizador.
 */
export async function getAdaptiveMetrics(
  baseDifficulty: number,
  topic: string
): Promise<RewardMultiplier> {
  // 1. Busca os dados do utilizador
  const user = await getUser() as unknown as UserStats;
  if (!user) return { xpMultiplier: 1, coinMultiplier: 1, difficulty: baseDifficulty };

  let difficulty = baseDifficulty;

  // 2. Busca histórico real da tabela 'memory' para análise de performance
  const recentLogs = await db.table('memory')
    .where('topic').equals(topic)
    .reverse()
    .limit(5)
    .toArray();

  const todayStr = new Date().toDateString();

  if (recentLogs.length > 0) {
    const successCount = recentLogs.filter(log => log.success).length;
    const avgAttempts = recentLogs.reduce((acc, curr) => acc + (curr.attempts || 1), 0) / recentLogs.length;
    
    const sessionsToday = recentLogs.filter(log => 
      new Date(log.timestamp).toDateString() === todayStr
    ).length;

    // Ajuste: Se a taxa de sucesso for baixa ou muitas tentativas, reduz dificuldade
    if (successCount / recentLogs.length < 0.5 || avgAttempts > 2) {
      difficulty -= 1;
    } 
    // Se performance for perfeita, aumenta
    else if (successCount === recentLogs.length && avgAttempts === 1) {
      difficulty += 1;
    }

    // Fadiga: Reduz carga mental após 8 exercícios no mesmo dia
    if (sessionsToday > 8) difficulty -= 0.5;
  }

  // 3. INTEGRAÇÃO COGNITIVA
  const profile: CognitiveProfile = user.cognitive;

  if (profile === "tdah") {
    difficulty = Math.min(difficulty, 3); // Hard cap para evitar burnout
  } else if (profile === "Deep_Dive") {
    difficulty += 1; // Deep Dive prefere desafios complexos
  }

  // 4. PROGRESSÃO POR XP
  const userLevel = Math.floor(user.xp / 1000);
  if (userLevel > 10) difficulty += 0.5;

  // Clamping (1-5) conforme o sistema de estrelas/raridade
  const finalDifficulty = Math.max(1, Math.min(5, Math.round(difficulty)));

  // 5. CÁLCULO DE RECOMPENSA ECONOMIA
  const xpMultiplier = 1 + (finalDifficulty - 1) * 0.25;
  const coinMultiplier = 1 + (finalDifficulty - 1) * 0.15;

  return {
    difficulty: finalDifficulty,
    xpMultiplier,
    coinMultiplier
  };
}

/**
 * Retorna o prompt de estilo de explicação baseado no perfil
 */
export function getExplanationStyle(profile: CognitiveProfile): string {
  const styles: Record<string, string> = {
    "tdah": "Explicações em tópicos curtos, objetivos e visualmente espaçados.",
    "Deep_Dive": "Explicações detalhadas, conceituais e com mergulho técnico profundo.",
    "Standard": "Equilíbrio entre teoria e prática com exemplos claros.",
    "Visual_Logic": "Foco em fluxogramas mentais e analogias estruturais."
  };

  return styles[profile] || styles["Standard"];
}

/**
 * HELPER para o reinforce.ts (Retrocompatibilidade e clareza)
 */
export async function getAdaptiveDifficulty(baseDifficulty: number, topic: string) {
    const metrics = await getAdaptiveMetrics(baseDifficulty, topic);
    return metrics.difficulty;
}