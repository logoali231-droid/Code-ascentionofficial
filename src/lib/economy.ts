"use client";

import { get, save, updateUser, db } from "./db";
import { playSound } from "./sounds";
import { calculateLevel } from "./level";
import { InventoryItem, UserStats } from "@/types";
import { FactionManager } from "./ranking/factions";

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
  // Aplica o bônus de facção (ex: 0.15 = +15%)
  return Math.max(5, Math.floor(reward * (1 + factionBonus)));
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

export async function buyItem(item: InventoryItem) {
  return await db.transaction('rw', db.user, async () => {
    const user = await db.user.get("main") as UserStats;
    if (!user) throw new Error("USER_NOT_FOUND");

    const bonuses = FactionManager.getActiveBonuses(user.factionId || "", user.xp || 0);
    const efficiency = bonuses.find(b => b.type === 'RESOURCE_EFFICIENCY')?.value || 0;

    const price = item.price || 0;
    const baseDynamicPrice = Math.floor(price * (1 + (user.level || 1) * 0.03));
    const dynamicPrice = Math.floor(baseDynamicPrice * (1 - efficiency));

    if ((user.coins || 0) < dynamicPrice) {
      playSound("error", 0.4);
      throw new Error("INSUFFICIENT_CREDITS");
    }

    const inventory = [...(user.inventory || [])];
    const existingIndex = inventory.findIndex((i) => i.id === item.id);

    if (existingIndex > -1) {
      inventory[existingIndex].quantity = (inventory[existingIndex].quantity || 1) + 1;
    } else {
      inventory.push({ ...item, quantity: 1, acquiredAt: Date.now() });
    }

    const newCoins = (user.coins || 0) - dynamicPrice;
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
