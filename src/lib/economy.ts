"use client";

import { get, save, updateUser } from "./db";
import { playSound } from "./sounds";
import { calculateLevel } from "./level";
import { InventoryItem, UserStats } from "@/types";

/**
 * FILA DE EXECUÇÃO (MUTEX)
 * Evita race conditions em cliques rápidos de compra ou ganho de XP.
 */
let transactionQueue: Promise<any> = Promise.resolve();

async function enqueueTransaction<T>(task: () => Promise<T>): Promise<T> {
  const result = transactionQueue.then(task);
  transactionQueue = result.catch((err) => {
    console.error("Transaction Error:", err);
  });
  return result;
}

/**
 * ADICIONAR XP (ATÔMICO)
 * Gerencia progressão, calcula o nível em tempo real e salva.
 */
export async function addXP(amount: number) {
  return enqueueTransaction(async () => {
    const user = await get("user", "main") as UserStats;
    if (!user) return;

    const newXP = (user.xp || 0) + amount;
    const newLevel = calculateLevel(newXP);
    
    const leveledUp = newLevel > (user.level || 1);

    if (leveledUp) {
      playSound("level-up", 0.6);
      // Aqui você poderia disparar um evento de UI ou flag de recompensa
    }

    const updated = await updateUser({
      xp: newXP,
      level: newLevel
    });

    // Forçamos o save para garantir integridade em operações críticas
    await save("user", updated);
    
    return updated;
  });
}

/**
 * COMPRAR ITEM (ATÔMICO)
 * Usa InventoryItem para tipagem e garante persistência via save.
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

    const inventory: InventoryItem[] = [...(user.inventory || [])];
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

    await save("user", updated);
    playSound("buy", 0.5);
    return updated;
  });
}

/**
 * USAR ITEM
 * Gerencia consumíveis e equipáveis com segurança de tipo.
 */
export async function useItem(itemId: string) {
  return enqueueTransaction(async () => {
    const user = await get("user", "main") as UserStats;
    if (!user) return;

    const inventory: InventoryItem[] = [...(user.inventory || [])];
    const itemIndex = inventory.findIndex((i) => i.id === itemId);

    if (itemIndex === -1) return;
    const item = inventory[itemIndex];

    // 1. Consumíveis (Boosters)
    if (item.type === "booster") {
      if (item.effect === "xp_grant") {
        // Adiciona XP respeitando a fila
        await addXP(item.effectValue || 100);
      }

      if ((item.quantity || 1) > 1) {
        inventory[itemIndex].quantity! -= 1;
      } else {
        inventory.splice(itemIndex, 1);
      }
    }

    // 2. Equipáveis (Chips de Modificação)
    else if (item.type === "chip") {
      inventory.forEach((i) => {
        if (i.type === "chip") i.equipped = false;
      });
      inventory[itemIndex].equipped = !item.equipped;
    }

    const updated = await updateUser({ inventory });
    await save("user", updated);
    playSound("click", 0.3);
  });
}

/**
 * ADICIONAR MOEDAS
 */
export async function addCoins(amount: number) {
  return enqueueTransaction(async () => {
    const user = await get("user", "main") as UserStats;
    if (!user) return;

    const updated = await updateUser({
      coins: (user.coins || 0) + amount
    });
    
    await save("user", updated);
    return updated;
  });
}