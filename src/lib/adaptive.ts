"use client";

import { db, getUser } from "./db";
// Forçamos o cast para UserStats para resolver o erro 2322
import { UserStats, MemoryLog, CognitiveProfile, AdaptiveMetrics } from '@/types/index';

interface RewardMultiplier {
  xpMultiplier: number;
  coinMultiplier: number;
  difficulty: number;
}

export async function getAdaptiveMetrics(
  currentDifficulty?: number,
  currentTopic?: string
): Promise<AdaptiveMetrics & RewardMultiplier> {
  
  // 1. Coleta de dados (Resolvendo o Type Mismatch)
  const user = await getUser() as unknown as UserStats; 
  
  const profile: CognitiveProfile = user?.cognitive || 'Standard';
  const userXP = user?.xp || 0;
  const userLevel = user?.level || 1;
  const streak = user?.streak || 0;
  
  // 2. Filtro de Memória inteligente
  const history: MemoryLog[] = await db.table('memory').toArray();
  const topicLogs = currentTopic 
    ? history.filter(h => h.topic === currentTopic).slice(-5)
    : history.slice(-5);

  // 3. Cálculos de Performance
  const avgAttempts = topicLogs.length > 0 
    ? topicLogs.reduce((acc, h) => acc + (h.attempts || 1), 0) / topicLogs.length 
    : 1.5;

  const successRate = topicLogs.length > 0
    ? topicLogs.filter(h => h.success).length / topicLogs.length
    : 0.7;

  // 4. Lógica de Dificuldade (Agora usando Level do UserStats)
  // A base sobe conforme o nível do usuário, não só XP
  let baseDifficulty = currentDifficulty || Math.min(5, (userLevel * 0.5) + 1);

  if (successRate > 0.8) baseDifficulty += 0.5;
  if (successRate < 0.4) baseDifficulty -= 0.8;

  const finalDifficulty = calculateGranularDifficulty(baseDifficulty, successRate, avgAttempts);

  // 5. Customização por Perfil e Multiplicadores
  const isADHD = profile === 'tdah';
  
  // Bonus de Streak: Mais moedas e XP se o usuário estiver em sequência
  const streakBonus = Math.min(2, 1 + (streak * 0.1));

  return {
    difficulty: finalDifficulty,
    // Se for TDAH, o multiplicador de XP é maior para manter o dopamina alta
    xpMultiplier: parseFloat((finalDifficulty * (isADHD ? 1.8 : 1.2) * streakBonus).toFixed(2)),
    // Moedas escalam com o nível do usuário (UserStats servindo pra algo!)
    coinMultiplier: Math.floor(finalDifficulty * 10 * (1 + userLevel * 0.1)),
    focusMode: isADHD && (finalDifficulty > 3.5 || avgAttempts > 2),
    style: getExplanationStyle(profile)
  };
}

export function getExplanationStyle(profile: CognitiveProfile): string {
  const styles: Record<string, string> = {
    "tdah": "Explicações atômicas. Use [B] para termos chave. Máximo 3 tópicos.",
    "Deep_Dive": "Explique a arquitetura por trás do conceito. Use analogias de baixo nível.",
    "Standard": "Exemplo prático seguido de teoria breve.",
    "Visual_Logic": "Descreva o fluxo de dados como um mapa ou engrenagens."
  };
  return styles[profile] || styles["Standard"];
}

function calculateGranularDifficulty(
  base: number, 
  successRate: number, 
  avgAttempts: number
): number {
  const consistencyBonus = successRate > 0.9 ? 0.3 : 0;
  const struggleTax = avgAttempts > 2.5 ? 0.5 : 0;
  const finalValue = base + consistencyBonus - struggleTax;

  return parseFloat(Math.max(1, Math.min(5, finalValue)).toFixed(3));
}