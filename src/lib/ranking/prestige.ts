/**
 * @file prestige.ts
 * @project Code-Ascension
 * @version 1.1.0
 * @description Core do sistema de Ascensão.
 * Integrado com as novas Facções Filosóficas e Sistema de Tiers.
 */

import { FactionManager, FactionBonus } from "./factions";

export interface PrestigeStats {
  ascensionCount: number;
  totalMemoryShards: number;
  spentMemoryShards: number;
  knowledgeMultiplier: number;
  lastAscensionDate: number;
  unlockedTiers: number[];
}

export interface PrestigeUpgrade {
  id: string;
  name: string;
  description: string;
  baseCost: number;
  maxLevel: number;
  multiplierPerLevel: number;
  type: "XP" | "MEMORY" | "AI_SPEED" | "LOGIC_BUFF";
}

export const PRESTIGE_UPGRADES: Record<string, PrestigeUpgrade> = {
  neural_plasticity: {
    id: "neural_plasticity",
    name: "Plasticidade Neural",
    description: "Aumenta permanentemente o ganho de XP em todos os módulos.",
    baseCost: 10,
    maxLevel: 50,
    multiplierPerLevel: 0.1,
    type: "XP",
  },
  silicon_intuition: {
    id: "silicon_intuition",
    name: "Intuição de Silício",
    description: "Melhora a precisão das dicas fornecidas pela IA Local.",
    baseCost: 25,
    maxLevel: 10,
    multiplierPerLevel: 0.05,
    type: "LOGIC_BUFF",
  },
  cache_optimization: {
    id: "cache_optimization",
    name: "Otimização de Cache Mental",
    description: "Reduz o consumo de recursos dos modelos offline.",
    baseCost: 50,
    maxLevel: 5,
    multiplierPerLevel: 0.2,
    type: "AI_SPEED",
  },
};

export const PRESTIGE_TIERS = [
  {
    tier: 1,
    title: "The Awakened",
    requirement: 1,
    globalBonus: "Unlocks Advanced Faction Cosmetics",
  },
  {
    tier: 5,
    title: "System Overlord",
    requirement: 5,
    globalBonus: "Multi-Faction Specialization (2 Facções Ativas)",
  },
  {
    tier: 10,
    title: "Ghost in the Machine",
    requirement: 10,
    globalBonus: "Infinite Learning (Sem decaimento de XP)",
  },
];

export class PrestigeManager {
  /**
   * Calcula ganhos de Memory Shards.
   */
  static calculateShardsToGain(currentXp: number): number {
    if (currentXp < 50000) return 0;
    const baseShards = Math.floor(Math.sqrt(currentXp - 40000) / 10);
    return baseShards > 0 ? baseShards : 1;
  }

  /**
   * Valida elegibilidade via FactionManager.
   */
  static isEligibleForAscension(
    currentXp: number,
    currentLevel: number,
  ): boolean {
    return FactionManager.canAscend(currentXp, currentLevel);
  }

  /**
   * Executa a Ascensão e calcula bônus de Tier e Facção.
   */
  static performAscension(
    currentStats: PrestigeStats,
    currentXp: number,
    factionId: string,
  ) {
    const shardsGained = this.calculateShardsToGain(currentXp);
    const newAscensionCount = currentStats.ascensionCount + 1;

    // Busca bônus da facção atual (Tratando tipagem para evitar erro 'any')
    const factionBonuses = FactionManager.getActiveBonuses(
      factionId,
      currentXp,
    );
    const xpBoost =
      factionBonuses.find((b: FactionBonus) => b.type === "XP_BOOST")?.value ||
      0;

    // Verifica novos Tiers desbloqueados
    const currentTiers = currentStats.unlockedTiers || [];
    const newlyUnlockedTiers = PRESTIGE_TIERS.filter(
      (t) =>
        t.requirement <= newAscensionCount && !currentTiers.includes(t.tier),
    ).map((t) => t.tier);

    const newStats: PrestigeStats = {
      ...currentStats,
      ascensionCount: newAscensionCount,
      totalMemoryShards: currentStats.totalMemoryShards + shardsGained,
      // Multiplicador: Shards + Bônus passivo da facção
      knowledgeMultiplier:
        currentStats.knowledgeMultiplier + shardsGained * 0.05 + xpBoost * 0.1,
      lastAscensionDate: Date.now(),
      unlockedTiers: [...currentTiers, ...newlyUnlockedTiers],
    };

    // Feedback baseado na facção
    const factionName =
      FactionManager.getFactionById(factionId)?.name || "Sistema";

    return {
      newStats,
      shardsGained,
      message: `Ascensão Concluída via ${factionName}. Sua consciência evoluiu.`,
    };
  }

  static getUpgradeCost(upgradeId: string, currentLevel: number): number {
    const upgrade = PRESTIGE_UPGRADES[upgradeId];
    return upgrade
      ? Math.floor(upgrade.baseCost * Math.pow(1.5, currentLevel))
      : Infinity;
  }
}
