"use client";

// Importa a função real com os gatilhos de sincronização de abas e nuvem
import { updateUser as realUpdateUser } from "./db";
import { addXP as economyAddXP } from "./economy";

// Repassa a chamada para a função central mapeada no db.ts
export async function updateUser(updates: any) {
  return await realUpdateUser(updates);
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
    newLevel: result?.level || 1,
  };
}

// No sistema síncrono por transação de banco local, os flushes passam a ser resolvidos imediatamente
export const forceSyncXP = async () => Promise.resolve();
export const forceSync = async () => Promise.resolve();
