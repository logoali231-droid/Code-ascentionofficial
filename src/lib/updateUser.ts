"use client";

import { get, save, db } from "./db";
import { playSound } from "./sounds";
import { calculateLevel } from "./level";
import { UserStats, InventoryItem } from "@/types";

let transactionQueue: Promise<any> = Promise.resolve();
let xpUpdateTimer: NodeJS.Timeout | null = null;
let pendingXP = 0;

async function enqueueTransaction<T>(task: () => Promise<T>): Promise<T> {
  const result = transactionQueue.then(task);
  transactionQueue = result.catch(() => { });
  return result;
}

export async function updateUser(updates: any) {
  return await db.transaction('rw', db.user, async () => {
    const current = await db.user.get('main') || { id: 'main', xp: 0, coins: 0 };
    const merged = { ...current, ...updates, id: 'main' };
    await db.user.put(merged);
    return merged;
  });
}

// Sincroniza XP pendente imediatamente antes de outras transações
async function flushXP() {
  if (pendingXP === 0) return;
  const amount = pendingXP;
  pendingXP = 0;
  
  const user = await get("user", "main") as UserStats;
  if (!user) return;

  const currentXP = user.xp || 0;
  const oldLevel = calculateLevel(currentXP);
  const newXP = currentXP + amount;
  const newLevel = calculateLevel(newXP);
  const updates: Partial<UserStats> = { xp: newXP };

  if (newLevel > oldLevel) {
    playSound("levelup", 0.6);
    updates.coins = (user.coins || 0) + (newLevel * 100);
  }
  await updateUser(updates);
}

export async function buyItem(item: InventoryItem) {
  return enqueueTransaction(async () => {
    await flushXP(); // Garante que o ouro do level up entrou antes da compra
    const user = await get("user", "main") as UserStats;
    if (!user) throw new Error("USER_NOT_FOUND");

    const price = item.price || 0;
    const currentCoins = user.coins || 0;

    if (currentCoins < price) {
      playSound("error", 0.4);
      throw new Error("INSUFFICIENT_CREDITS");
    }

    const inventory = [...(user.inventory || [])];
    const existingIndex = inventory.findIndex((i) => i.id === item.id);

    if (existingIndex > -1) {
      inventory[existingIndex] = {
        ...inventory[existingIndex],
        quantity: (inventory[existingIndex].quantity || 1) + 1
      };
    } else {
      inventory.push({ ...item, quantity: 1, acquiredAt: Date.now() });
    }

    return await updateUser({ coins: currentCoins - price, inventory: inventory });
  });
}

// Adicionado parâmetro 'immediate' para casos de fim de lição
export async function addXP(amount: number, immediate = false) {
  pendingXP += amount;
  if (xpUpdateTimer) clearTimeout(xpUpdateTimer);
  
  if (immediate) {
    return await enqueueTransaction(flushXP);
  }

  xpUpdateTimer = setTimeout(() => {
    enqueueTransaction(flushXP);
  }, 1500);
}

// Export para garantir consistência antes de mudar de página (Ex: Voltar ao Hub)
export const forceSyncXP = async () => await enqueueTransaction(flushXP);

// Mantendo exportações originais e compatibilidade com o sistema
export const forceSync = async () => enqueueTransaction(flushXP);
