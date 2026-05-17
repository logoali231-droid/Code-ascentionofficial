"use client";
"use client";

import { get, save, updateUser, db } from "./db";
import { playSound } from "./sounds";
import { calculateLevel } from "./level";
import { InventoryItem, UserStats } from "@/types";
import { FactionManager } from "./ranking/factions";
import { syncScoreToCloud } from "./leaderboardService"; // Importação do worker de sincronização

/**
 * =========================================
 * RANK SYSTEM
 * =========================================
 */

export type RankTier = "Initiate" | "Operator" | "Architect" | "Ghost" | "Overmind";

export const RANKS: { name: RankTier; minLevel: number; color: string; }[] = [
  { name: "Initiate", minLevel: 1, color: "#94a3b8" },
  { name: "Operator", minLevel: 5, color: "#22c55e" },
  { name: "Architect", minLevel: 12, color: "#3b82f6" },
  { name: "Ghost", minLevel: 25, color: "#a855f7" },
  { name: "Overmind", minLevel: 40, color: "#f59e0b" },
];

/**
 * =========================================
 * XP & COIN CURVES
 * =========================================
 */

function computeXPReward(base: number, level: number, factionBonus: number = 0) {
  const scaling = 1 / (1 + level * 0.015);
  const reward = Math.floor(base * scaling);
  const diminishingFactionBonus = factionBonus / (1 + factionBonus);
  return Math.max(5, Math.floor(reward * (1 + diminishingFactionBonus)));
}

function computeCoinReward(base: number, level: number) {
  const scaling = 1 / (1 + level * 0.02);
  return Math.max(2, Math.floor(base * scaling));
}

/**
 * =========================================
 * RANK & MASTERY HELPERS
 * =========================================
 */

export function getRankFromLevel(level: number): RankTier {
  let current: RankTier = "Initiate";
  for (const rank of RANKS) {
    if (level >= rank.minLevel) current = rank.name;
  }
  return current;
}

export function getNextRank(level: number) {
  return RANKS.find((r) => r.minLevel > level);
}

export function computeMastery(xp: number, streak: number) {
  const xpFactor = Math.min(70, xp / 250);
  const streakFactor = Math.min(30, streak * 2);
  return Math.min(100, Math.floor(xpFactor + streakFactor));
}

/**
 * =========================================
 * ADD XP
 * =========================================
 */

export async function addXP(amount: number) {
  return await db.transaction('rw', db.user, async () => {
    const user = await db.user.get("main") as UserStats;
    if (!user) return null;

    const bonuses = FactionManager.getActiveBonuses(user.factionId || "", user.xp || 0);
    const xpBoost = bonuses.find(b => b.type === 'XP_BOOST')?.value || 0;

    const currentLevel = user.level || 1;
    const finalXP = computeXPReward(amount, currentLevel, xpBoost);
    const newXP = (user.xp || 0) + finalXP;
    const newLevel = calculateLevel(newXP);
    const oldRank = getRankFromLevel(currentLevel);
    const newRank = getRankFromLevel(newLevel);
    const mastery = computeMastery(newXP, user.streak || 0);

    const leveledUp = newLevel > currentLevel;
    const rankUp = oldRank !== newRank;

    if (leveledUp) playSound("level-up", 0.6);
    if (rankUp) playSound("rare", 0.9);

    const updates = {
      xp: newXP,
      level: newLevel,
      rank: newRank,
      mastery,
      lastXPReward: finalXP,
    };

    await db.user.update("main", updates);
    
    // Dispara a sincronização em segundo plano sem bloquear a UI do usuário
    setTimeout(() => {
      syncScoreToCloud().catch(err => console.warn("[CLOUD_SYNC_MUTED]", err));
    }, 800);
    
    return { ...user, ...updates, rankUp, leveledUp, gainedXP: finalXP };
  });
}


/**
 * =========================================
 * ADD COINS
 * =========================================
 */

export async function addCoins(amount: number) {
  return await db.transaction('rw', db.user, async () => {
    const user = await db.user.get("main") as UserStats;
    if (!user) return null;

    const finalCoins = computeCoinReward(amount, user.level || 1);
    const newTotal = (user.coins || 0) + finalCoins;

    await db.user.update("main", { coins: newTotal });
    
    return { ...user, coins: newTotal };
  });
}

/**
 * =========================================
 * BUY ITEM
 * =========================================
 */

/**
 * =========================================
 * BUY ITEM (COM TRAVA ANTI-INFLAÇÃO)
 * =========================================
 */

export async function buyItem(item: InventoryItem) {
  return await db.transaction('rw', db.user, async () => {
    const user = await db.user.get("main") as UserStats;
    if (!user) throw new Error("USER_NOT_FOUND");

    const bonuses = FactionManager.getActiveBonuses(user.factionId || "", user.xp || 0);
    const efficiency = bonuses.find(b => b.type === 'RESOURCE_EFFICIENCY')?.value || 0;

    const userCoins = user.coins || 0;
    const basePrice = item.price || 0;

    // 1. Injeção do Multiplicador de Barreira de Capital (Baseado no saldo acumulado)
    const capitalBarrierMultiplier = 1 + Math.sqrt(userCoins / 100000);

    // 2. Precificação Procedural combinando Nível do Usuário + Barreira de Capital
    const levelScaling = 1 + (user.level || 1) * 0.03;
    const baseDynamicPrice = Math.floor(basePrice * levelScaling * capitalBarrierMultiplier);
    
    // 3. Aplica descontos de facção por último
    const finalPrice = Math.floor(baseDynamicPrice * (1 - efficiency));

    if (userCoins < finalPrice) {
      playSound("error", 0.4);
      throw new Error("INSUFFICIENT_CREDITS");
    }

    const inventory = [...(user.inventory || [])];
    
    // Chips são itens únicos por causa da durabilidade individual, outros acumulam quantidade
    const isChip = item.type === "chip";
    const existingIndex = isChip ? -1 : inventory.findIndex((i) => i.id === item.id);

    if (existingIndex > -1) {
      inventory[existingIndex].quantity = (inventory[existingIndex].quantity || 1) + 1;
    } else {
      // Se for um chip, inicializa as propriedades de durabilidade
      const newItem = { 
        ...item, 
        quantity: 1, 
        acquiredAt: Date.now(),
        ...(isChip && { durability: item.maxDurability || 100, maxDurability: item.maxDurability || 100 })
      };
      inventory.push(newItem);
    }

    const newCoins = userCoins - finalPrice;
    await db.user.update("main", { coins: newCoins, inventory });

    playSound("buy", 0.5);
    return { ...user, coins: newCoins, inventory };
  });
}

/**
 * =========================================
 * USE ITEM
 * =========================================
 */

export async function useItem(itemId: string) {
  return await db.transaction('rw', db.user, async () => {
    const user = await db.user.get("main") as UserStats;
    if (!user) return;

    const inventory = [...(user.inventory || [])];
    const itemIndex = inventory.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) return;

    const item = inventory[itemIndex];

    if (item.type === "booster") {
      if (item.effect === "xp_grant") {
        const bonus = item.effectValue || 100;
        const newXP = (user.xp || 0) + bonus;
        user.xp = newXP;
        user.level = calculateLevel(newXP);
      }

      if ((item.quantity || 1) > 1) {
        inventory[itemIndex].quantity! -= 1;
      } else {
        inventory.splice(itemIndex, 1);
      }
    } else if (item.type === "chip") {
      inventory.forEach((i) => { if (i.type === "chip") i.equipped = false; });
      inventory[itemIndex].equipped = !item.equipped;
    }

    await db.user.update("main", {
      inventory,
      xp: user.xp,
      level: user.level
    });

    playSound("click", 0.3);
  });
}


/**
 * =========================================
 * MECÂNICA DE QUEIMA DE MOEDAS (MONEY SINK)
 * =========================================
 */

/**
 * Reduz a durabilidade do chip equipado atualmente.
 * Deve ser chamada após o usuário concluir lições, exercícios ou ações cruciais.
 */
export async function degradeEquippedChips(amount: number = 5) {
  return await db.transaction('rw', db.user, async () => {
    const user = await db.user.get("main") as UserStats;
    if (!user || !user.inventory) return null;

    let affected = false;
    const updatedInventory = user.inventory.map((item) => {
      if (item.type === "chip" && item.equipped && item.durability !== undefined) {
        affected = true;
        const newDurability = Math.max(0, item.durability - amount);
        return { ...item, durability: newDurability };
      }
      return item;
    });

    if (affected) {
      await db.user.update("main", { inventory: updatedInventory });
    }
    return { ...user, inventory: updatedInventory };
  });
}

/**
 * Cobra moedas para restaurar totalmente a durabilidade de um chip específico
 */
export async function repairChip(itemId: string) {
  return await db.transaction('rw', db.user, async () => {
    const user = await db.user.get("main") as UserStats;
    if (!user) throw new Error("USER_NOT_FOUND");

    const inventory = [...(user.inventory || [])];
    const itemIndex = inventory.findIndex((i) => i.id === itemId && i.type === "chip");
    
    if (itemIndex === -1) throw new Error("CHIP_NOT_FOUND");
    const chip = inventory[itemIndex];

    if (chip.durability === chip.maxDurability) throw new Error("CHIP_ALREADY_MAX_DURABILITY");

    const missingDurability = (chip.maxDurability || 100) - (chip.durability || 0);
    
    // O custo de reparo escala proporcionalmente ao preço base do chip e ao desgaste
    const repairCost = Math.floor((chip.price * 0.2) * (missingDurability / (chip.maxDurability || 100)));

    if (user.coins < repairCost) {
      playSound("error", 0.4);
      throw new Error("INSUFFICIENT_CREDITS_FOR_REPAIR");
    }

    // Restaura o chip e debita as moedas (recurso destruído/queimado)
    inventory[itemIndex].durability = chip.maxDurability;
    const newCoins = user.coins - repairCost;

    await db.user.update("main", { coins: newCoins, inventory });
    playSound("buy", 0.4); // Som de transação de conserto

    return { ...user, coins: newCoins, inventory };
  });
}