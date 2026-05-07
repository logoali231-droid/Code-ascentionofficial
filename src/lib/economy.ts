"use client";
import { get, save, updateUser } from "./db";
import { playSound } from "./sounds";
import { calculateLevel } from "./level";
import { InventoryItem } from "@/types";

/**
 * Sistema de Compra com Verificação de Sanidade
 */
export async function buyItem(item: any) {
  const user = await get("user", "main");
  if (!user) throw new Error("User not found");

  const price = item.price || 0;
  if ((user.coins || 0) < price) {
    playSound("error", 0.5);
    throw new Error("Insufficient neural credits (coins).");
  }

  // 1. Deduz moedas e adiciona ao inventário (Stacking logic)
  const inventory = user.inventory || [];
  const existingItemIndex = inventory.findIndex((i: any) => i.id === item.id);

  if (existingItemIndex > -1) {
    inventory[existingItemIndex].quantity = (inventory[existingItemIndex].quantity || 1) + 1;
  } else {
    inventory.push({ ...item, quantity: 1, acquiredAt: Date.now() });
  }

  await updateUser({
    coins: user.coins - price,
    inventory: inventory
  });

  playSound("buy", 0.4);
  return true;
}

/**
 * Lógica de Uso de Itens (Consumíveis vs Equipáveis)
 */
export async function useItem(itemId: string) {
  const user = await get("user", "main");
  if (!user) return;

  const inventory = [...(user.inventory || [])];
  const itemIndex = inventory.findIndex(i => i.id === itemId);
  if (itemIndex === -1) return;

  const item = inventory[itemIndex];

  // Exemplo de lógica de consumo
  if (item.type === "booster") {
    if (item.effect === "xp_boost") {
      await addXP(50);
    }
    
    // Diminui quantidade ou remove
    if (item.quantity > 1) {
      inventory[itemIndex].quantity -= 1;
    } else {
      inventory.splice(itemIndex, 1);
    }
  } 
  
  else if (item.type === "chip") {
    // Lógica de equipar: desequipa outros chips primeiro
    inventory.forEach(i => { if(i.type === "chip") i.equipped = false; });
    inventory[itemIndex].equipped = true;
  }

  await updateUser({ inventory });
  playSound("click", 0.3);
}

/**
 * Adição Atômica de XP
 */
export async function addXP(amount: number) {
  const user = await get("user", "main");
  const oldLevel = calculateLevel(user?.xp || 0);
  
  const updated = await updateUser({
    xp: (user?.xp || 0) + amount
  });

  const newLevel = calculateLevel(updated.xp);
  
  if (newLevel > oldLevel) {
    playSound("levelup", 0.6);
    // Bônus por level up
    await updateUser({ coins: (updated.coins || 0) + 100 });
  }
}
