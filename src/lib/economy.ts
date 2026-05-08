"use client";

import { get, save, updateUser } from "./db";
import { playSound } from "./sounds";
import { calculateLevel } from "./level";
import { InventoryItem } from "@/types";
import { addXP } from "./updateUser";

/**
 * FILA DE EXECUÇÃO (MUTEX)
 * Garante que transações financeiras e de XP não se sobreponham,
 * evitando que o usuário perca dados em cliques rápidos.
 */
let transactionQueue: Promise<any> = Promise.resolve();

async function enqueueTransaction<T>(task: () => Promise<T>): Promise<T> {
  const result = transactionQueue.then(task);
  transactionQueue = result.catch(() => {}); // Mantém a fila andando mesmo se falhar
  return result;
}

/**
 * ADICIONAR XP (ATÔMICO)
 * Gerencia progressão e dispara Level Up
 */


/**
 * COMPRAR ITEM (ATÔMICO)
 * Gerencia moedas, inventário e empilhamento (stacking)
 */
export async function buyItem(item: any) {
  return enqueueTransaction(async () => {
    const user = await get("user", "main");
    if (!user) throw new Error("USER_NOT_FOUND");

    const price = item.price || 0;
    const currentCoins = user.coins || 0;

    if (currentCoins < price) {
      playSound("error", 0.4);
      throw new Error("INSUFFICIENT_CREDITS");
    }

    const inventory = [...(user.inventory || [])];
    const existingIndex = inventory.findIndex((i: any) => i.id === item.id);

    // Lógica de Stacking (Empilhamento)
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
 * USAR ITEM
 * Aplica efeitos de consumíveis ou equipa chips
 */
export async function useItem(itemId: string) {
  return enqueueTransaction(async () => {
    const user = await get("user", "main");
    if (!user) return;

    const inventory = [...(user.inventory || [])];
    const itemIndex = inventory.findIndex((i: any) => i.id === itemId);

    if (itemIndex === -1) return;
    const item = inventory[itemIndex];

    // 1. Lógica para Consumíveis (Ex: Boosters)
    if (item.type === "booster") {
      if (item.effect === "xp_grant") {
        // Chamada interna de XP já está na fila
        setTimeout(() => addXP(item.effectValue || 100), 100);
      }

      if (item.quantity > 1) {
        inventory[itemIndex].quantity -= 1;
      } else {
        inventory.splice(itemIndex, 1);
      }
    }

    // 2. Lógica para Equipáveis (Ex: Chips)
    else if (item.type === "chip") {
      // Desequipa outros do mesmo tipo
      inventory.forEach((i: any) => {
        if (i.type === "chip") i.equipped = false;
      });
      inventory[itemIndex].equipped = !item.equipped; // Toggle
    }

    await updateUser({ inventory });
    playSound("click", 0.3);
  });
}

/**
 * ADICIONAR MOEDAS (RECOMPENSA DIRETA)
 */
export async function addCoins(amount: number) {
  return enqueueTransaction(async () => {
    const user = await get("user", "main");
    if (!user) return;

    const updated = await updateUser({
      coins: (user.coins || 0) + amount
    });
    return updated;
  });
}

