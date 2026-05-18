"use client";

import { db, getUser, get } from "./db";
import {
  UserStats,
  MemoryLog,
  CognitiveProfile,
  AdaptiveMetrics,
} from "@/types/index";
import { calculateLevel } from "./level";

interface RewardMultiplier {
  xpMultiplier: number;
  coinMultiplier: number;
  difficulty: number;
}

export async function getAdaptiveMetrics(
  currentDifficulty?: number,
  currentTopic?: string,
): Promise<AdaptiveMetrics & RewardMultiplier> {
  const user = (await getUser()) as unknown as UserStats;
  const profile: CognitiveProfile = user?.cognitive || "Standard";
  const userXP = user?.xp || 0;
  const userLevel = calculateLevel(userXP);
  const streak = user?.streak || 0;

  const history: MemoryLog[] = await db
    .table("memory")
    .orderBy("timestamp")
    .reverse()
    .limit(50)
    .toArray();

  const topicLogs = currentTopic
    ? history.filter((h) => h.topic === currentTopic).slice(0, 5)
    : history.slice(0, 5);

  const avgAttempts =
    topicLogs.length > 0
      ? topicLogs.reduce((acc, h) => acc + (h.attempts || 1), 0) /
        topicLogs.length
      : 1.5;

  const successRate =
    topicLogs.length > 0
      ? topicLogs.filter((h) => h.success).length / topicLogs.length
      : 0.7;

  let baseDifficulty = currentDifficulty || Math.min(5, userLevel * 0.1 + 1.5);

  if (successRate > 0.85) baseDifficulty += 0.4;
  if (successRate < 0.4) baseDifficulty -= 0.6;

  let finalDifficulty = calculateGranularDifficulty(
    baseDifficulty,
    successRate,
    avgAttempts,
  );

  // Amortece e sincroniza com a soberania do motor central se houver um estado ativo registrado

  const normalizedProfile = String(profile || "standard").toLowerCase();
  const isADHD = normalizedProfile === "tdah";
  const streakBonus = Math.min(2, 1 + streak * 0.05);

  return {
    difficulty: finalDifficulty,
    xpMultiplier: parseFloat(
      (finalDifficulty * (isADHD ? 1.8 : 1.2) * streakBonus).toFixed(2),
    ),

    coinMultiplier: Math.floor(finalDifficulty * 10 * (1 + userLevel * 0.05)),

    focusMode: isADHD && (finalDifficulty > 3.8 || avgAttempts > 2),

    style: getCognitiveFormattingRules(normalizedProfile),
  };
}

export function getCognitiveFormattingRules(profile: string): string {
  const rules: Record<string, string> = {
    tdah: "FORÇAR: Explicações atômicas. Use negritos markdown de forma cirúrgica. Máximo de 3 tópicos curtos por seção.",
    deep_dive:
      "FORÇAR: Arquitetura profunda, destrinchando o comportamento de baixo nível e escopo de memória do interpretador/compilador.",
    visual_logic:
      "FORÇAR: Representações em fluxogramas de texto (ASCII Art), mapeamento de dados ou tabelas comparativas de fluxo.",
    standard:
      "FORÇAR: Um exemplo prático em primeiro lugar, seguido de uma síntese teórica corta contendo a regra conceitual.",
  };
  return rules[profile] || rules["standard"];
}

function calculateGranularDifficulty(
  base: number,
  successRate: number,
  avgAttempts: number,
): number {
  const consistencyBonus = successRate > 0.95 ? 0.2 : 0;
  const struggleTax = avgAttempts > 3 ? 0.7 : 0;
  const finalValue = base + consistencyBonus - struggleTax;

  return parseFloat(Math.max(1, Math.min(5, finalValue)).toFixed(3));
}
