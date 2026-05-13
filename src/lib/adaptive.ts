"use client";

import { db, getUser } from "./db";
import { UserStats, MemoryLog, CognitiveProfile, AdaptiveMetrics } from '@/types/index';
// Importamos a nova lógica de nível para manter a consistência
import { calculateLevel } from "./level"; 

interface RewardMultiplier {
  xpMultiplier: number;
  coinMultiplier: number;
  difficulty: number;
}

export async function getAdaptiveMetrics(
  currentDifficulty?: number,
  currentTopic?: string
): Promise<AdaptiveMetrics & RewardMultiplier> {
  
  // 1. Coleta de dados com Type Casting seguro
  const user = await getUser() as unknown as UserStats; 
  
  const profile: CognitiveProfile = user?.cognitive || 'Standard';
  const userXP = user?.xp || 0;
  // A nova forma: o nível agora é derivado da raiz quadrada do XP
  const userLevel = calculateLevel(userXP);
  const streak = user?.streak || 0;
  
  // 2. Filtro de Memória Otimizado (Evita processar arrays gigantes no M23)
  // Sugestão: No futuro, use um limite na query do Dexie/DB em vez de .toArray()
  const history: MemoryLog[] = await db.table('memory')
    .orderBy('timestamp')
    .reverse()
    .limit(50) 
    .toArray();

  const topicLogs = currentTopic 
    ? history.filter(h => h.topic === currentTopic).slice(0, 5)
    : history.slice(0, 5);

  // 3. Cálculos de Performance Pedagógica
  const avgAttempts = topicLogs.length > 0 
    ? topicLogs.reduce((acc, h) => acc + (h.attempts || 1), 0) / topicLogs.length 
    : 1.5;

  const successRate = topicLogs.length > 0
    ? topicLogs.filter(h => h.success).length / topicLogs.length
    : 0.7;

  // 4. Lógica de Dificuldade Adaptativa
  // Baseada no novo sistema de Níveis Infinitos: a dificuldade base escala mais suavemente
  let baseDifficulty = currentDifficulty || Math.min(5, (userLevel * 0.1) + 1.5);

  if (successRate > 0.85) baseDifficulty += 0.4;
  if (successRate < 0.4) baseDifficulty -= 0.6;

  const finalDifficulty = calculateGranularDifficulty(baseDifficulty, successRate, avgAttempts);

  // 5. Multiplicadores e Perfil Cognitivo (Dopamina & Retenção)
  const isADHD = profile === 'tdah';
  
  // Bônus de Streak (Max 2x)
  const streakBonus = Math.min(2, 1 + (streak * 0.05));

  return {
    difficulty: finalDifficulty,
    // Se for TDAH, xpMultiplier agressivo (1.8x) para feedback constante
    xpMultiplier: parseFloat((finalDifficulty * (isADHD ? 1.8 : 1.2) * streakBonus).toFixed(2)),
    
    // Moedas escalam com o nível do usuário para suportar a economia de "Endgame"
    coinMultiplier: Math.floor(finalDifficulty * 10 * (1 + userLevel * 0.05)),
    
    // Focus Mode: Ativa se o usuário TDAH estiver em uma tarefa complexa
    focusMode: isADHD && (finalDifficulty > 3.8 || avgAttempts > 2),
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
  const consistencyBonus = successRate > 0.95 ? 0.2 : 0;
  const struggleTax = avgAttempts > 3 ? 0.7 : 0;
  const finalValue = base + consistencyBonus - struggleTax;

  return parseFloat(Math.max(1, Math.min(5, finalValue)).toFixed(3));
}