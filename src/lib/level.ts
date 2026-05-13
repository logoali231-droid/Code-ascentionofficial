"use client";

// ============================================================
// 1. Configuração da Curva de Custo (XP para próximo nível)
// ============================================================
// Parâmetros da parábola: XP(L) = A*L² + B*L + C
const A = 50;
const B = 100;
const C = 0;

/**
 * XP necessária para subir do nível `level` para `level+1`.
 */
export function xpCostForNextLevel(level: number): number {
  return A * level * level + B * level + C;
}

// ============================================================
// 2. Tabela de Thresholds (XP total acumulada mínima para cada nível)
// ============================================================
const MAX_LEVEL = 100;

// Array: índice = nível, valor = XP total mínima para ser aquele nível.
// Ex: thresholds[1] = 0, thresholds[2] = 150, thresholds[3] = 350, ...
function buildXpThresholds(maxLevel: number): number[] {
  const thresholds: number[] = [0, 0];
  let total = 0;
  for (let lv = 1; lv < maxLevel; lv++) {
    total += xpCostForNextLevel(lv);
    thresholds.push(total);
  }
  return thresholds;
}

const LEVEL_THRESHOLDS = buildXpThresholds(MAX_LEVEL);

// ============================================================
// 3. Cálculo do nível a partir da XP total
// ============================================================
export function calculateLevel(totalXp?: number): number {
  const xp = totalXp ?? 0;
  // thresholds[1] já é 0, então o nível mínimo é 1
  let level = 1;
  // thresholds.length = MAX_LEVEL+1, pois thresholds[0] não usado
  for (let i = 2; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i;
    } else {
      break;
    }
  }
  return Math.max(1, level);
}

// ============================================================
// 4. Progresso dentro do nível atual (para barras de progresso)
// ============================================================
export interface XpProgress {
  level: number;
  currentLevelXp: number;   // XP acumulada desde o início do nível atual
  xpForNextLevel: number;   // XP necessária para o próximo nível
  progress: number;         // 0..1
}

export function getXpProgress(totalXp?: number): XpProgress {
  const xp = totalXp ?? 0;
  const level = calculateLevel(xp);
  const nextLevel = level + 1;
  const xpAtCurrentLevelStart = LEVEL_THRESHOLDS[level] ?? 0;
  const xpForNext = xpCostForNextLevel(level);
  const currentLevelXp = xp - xpAtCurrentLevelStart;
  const progress = Math.min(currentLevelXp / xpForNext, 1);
  return {
    level,
    currentLevelXp,
    xpForNextLevel: xpForNext,
    progress,
  };
}

// ============================================================
// 5. Cálculo de recompensa de XP por lição
// ============================================================
/**
 * Calcula o XP ganho ao concluir uma lição.
 * @param playerLevel  nível atual do jogador (antes de ganhar XP)
 * @param difficulty   dificuldade da lição (0 = muito fácil, 1 = muito difícil)
 * @param streakDays   dias consecutivos de estudo (streak)
 * @param completion   percentual de conclusão da lição (0..1)
 */
export function computeLessonXp(
  playerLevel: number,
  difficulty: number,
  streakDays: number,
  completion: number
): number {
  const base = 20 + playerLevel * 2;             // escala linear com o nível
  const multDiff = 1 + 0.2 * difficulty;          // +20% para dificuldade máxima
  const multStreak = 1 + 0.05 * streakDays;       // +5% por dia de streak
  const multCompletion = 1 + 0.1 * completion;    // +10% se 100% concluído
  return Math.round(base * multDiff * multStreak * multCompletion);
}

// ============================================================
// 6. Títulos de prestígio (baseados em nível e precisão)
// ============================================================
export function getLevelTitle(user: any): string {
  const level = user?.level ?? calculateLevel(user?.xp ?? 0);
  const errors = user?.errors ?? 0;
  const xp = user?.xp ?? 0;

  // Títulos especiais por relação erros/XP
  if (xp > 300 && errors < xp * 0.2) return "Precise";
  if (errors > xp * 0.5) return "Overconfident";

  // Títulos padrão por faixa de nível
  if (level < 5) return "Noob"; 
  if (level < 10) return "Apprentice";
  if (level < 20) return "Kernel";
  if (level < 35) return "Script Kiddie";
  if (level < 50) return "Byte Knight";
  return "Architect";
}