"use client";

import { db } from "./db";
import { addXP as economyAddXP } from "./economy";

// Função genérica atômica para metadados simples
export async function updateUser(updates: any) {
  return await db.transaction('rw', db.user, async () => {
    const current = await db.user.get('main') || { id: 'main', xp: 0, coins: 0 };
    const merged = { ...current, ...updates, id: 'main' };
    await db.user.put(merged);
    return merged;
  });
}

// Aponta diretamente para a engine real da economia e evita inconsistência de concorrência
export async function addXP(amount: number, _immediate?: boolean) {
  return await economyAddXP(amount);
}

// Legados mantidos para compatibilidade de chamadas existentes sem quebrar outras rotas
export async function addExperience(amount: number) {
  const result = await economyAddXP(amount);
  return { 
    leveledUp: result?.leveledUp || false, 
    newLevel: result?.level || 1 
  };
}

// No sistema síncrono por transação de banco local, os flushes passam a ser resolvidos imediatamente
export const forceSyncXP = async () => Promise.resolve();
export const forceSync = async () => Promise.resolve();