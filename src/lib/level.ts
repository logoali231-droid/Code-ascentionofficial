"use client";

/**
 * CONFIGURAÇÃO DA CURVA DE PROGRESSÃO (RAIZ QUADRADA)
 * Fórmulas baseadas em: XP = (Level / Multiplier)²
 * Isso garante que o início seja rápido e o final (endgame Lvl 50+) seja desafiador.
 */
const LVL_MULTIPLIER = 0.125; // Ajusta a velocidade global. Menor = Mais difícil.

/**
 * Calcula o nível atual baseado no XP total acumulado.
 * Fórmula inversa: Level = sqrt(XP) * Multiplier
 */
export function calculateLevel(totalXp: number = 0): number {
  if (totalXp <= 0) return 1;
  // A curva de raiz quadrada permite progressão infinita sem tabelas fixas
  const level = Math.floor(Math.sqrt(totalXp) * LVL_MULTIPLIER) + 1;
  return Math.max(1, level);
}

/**
 * Calcula quanto XP TOTAL é necessário para atingir um determinado nível.
 * Fórmula: XP = (Level / Multiplier)²
 */
export function totalXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.pow((level - 1) / LVL_MULTIPLIER, 2);
}

/**
 * Progresso dentro do nível atual (para barras de progresso UI)
 */
export interface XpProgress {
  level: number;
  currentLevelXp: number; // XP ganho desde o início do nível atual
  xpForNextLevel: number; // XP total necessária para o próximo nível (relativo)
  progress: number; // 0..1 para a barra
}

export function getXpProgress(totalXp: number = 0): XpProgress {
  const level = calculateLevel(totalXp);
  const xpAtStartOfCurrent = totalXpForLevel(level);
  const xpAtStartOfNext = totalXpForLevel(level + 1);

  const xpRequiredForThisLevelRange = xpAtStartOfNext - xpAtStartOfCurrent;
  const currentLevelXp = totalXp - xpAtStartOfCurrent;

  const progress = Math.min(currentLevelXp / xpRequiredForThisLevelRange, 1);

  return {
    level,
    currentLevelXp: Math.floor(currentLevelXp),
    xpForNextLevel: Math.ceil(xpRequiredForThisLevelRange),
    progress,
  };
}

/**
 * CÁLCULO DE RECOMPENSA DE XP
 * Lógica: Nível menor ganha proporcionalmente mais (aceleração inicial).
 * Nível maior exige exercícios mais difíceis para manter o ritmo.
 */
export function computeLessonXp(
  playerLevel: number,
  difficulty: number, // 0.1 a 1.0
  streakDays: number = 0,
  completion: number = 1.0,
): number {
  // Base de XP que escala levemente com o nível para não tornar o jogo impossível
  // mas a curva de custo cresce mais rápido que essa base.
  const baseReward = 100 + playerLevel * 5;

  // Bônus de Dificuldade: Exercícios difíceis dão até 100% a mais de XP
  const difficultyBonus = 1 + difficulty;

  // Bônus de Streak: +5% por dia (capado em 50%)
  const streakBonus = 1 + Math.min(streakDays * 0.05, 0.5);

  // Penalidade de conclusão parcial
  const totalReward = baseReward * difficultyBonus * streakBonus * completion;

  return Math.round(totalReward);
}

/**
 * TÍTULOS CYBERPUNK (Baseados em Progressão)
 */
export function getLevelTitle(level: number): string {
  if (level < 5) return "Noob_Operator";
  if (level < 10) return "Script_Kiddie";
  if (level < 20) return "System_Stalker";
  if (level < 35) return "Net_Runner";
  if (level < 50) return "Grid_Architect";
  if (level < 100) return "Ghost_In_The_Shell";
  return "Binary_God";
}
