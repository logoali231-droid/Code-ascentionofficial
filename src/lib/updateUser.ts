"use client";

import { get, save, db } from "./db";
import { playSound } from "./sounds";
import { calculateLevel } from "./level";
import { UserStats, InventoryItem } from "@/types";

/**
 * FILA DE EXECUÇÃO (MUTEX)
 * Garante que transações financeiras não se sobreponham.
 */
let transactionQueue: Promise<any> = Promise.resolve();

async function enqueueTransaction<T>(task: () => Promise<T>): Promise<T> {
  const result = transactionQueue.then(task);
  transactionQueue = result.catch(() => {}); 
  return result;
}

/**
 * ATUALIZAÇÃO BASE (USADA PELAS OUTRAS)
 * Agora com tipagem correta para o build da Vercel
 */

export async function updateUser(updates: any) {
  // O erro ocorria aqui porque 'db' não estava visível
  return await db.transaction('rw', db.user, async () => {
    const current = await db.user.get('main') || { id: 'main', xp: 0, coins: 0 };
    // IMPORTANTE: Mesclamos os dados sem chamar a própria função updateUser
    const merged = { ...current, ...updates, id: 'main' };
    await db.user.put(merged);
    return merged;
  });
}

/**
 * COMPRAR ITEM (ATÔMICO + MUTEX)
 */
export async function buyItem(item: InventoryItem) {
  return enqueueTransaction(async () => {
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
      inventory.push({
        ...item,
        quantity: 1,
        acquiredAt: Date.now()
      });
    }

    const updated = await updateUser({
      coins: currentCoins - price,
      inventory: inventory
    });

    playSound("buy", 0.5);
    return updated;
  });
}

/**
 * ADICIONAR XP (ATÔMICO + MUTEX)
 */
export async function addXP(amount: number) {
  return enqueueTransaction(async () => {
    const user = await get("user", "main") as UserStats;
    if (!user) return;

    const currentXP = user.xp || 0;
    const oldLevel = calculateLevel(currentXP);
    const newXP = currentXP + amount;
    const newLevel = calculateLevel(newXP);

    const updates: Partial<UserStats> = { xp: newXP };

    if (newLevel > oldLevel) {
      playSound("levelup", 0.6);
      updates.coins = (user.coins || 0) + (newLevel * 50);
    }

    await updateUser(updates);
    return updates;
  });
}
