"use client";

import { get, save } from "@/lib/db";

/**
 * Retorna a data de hoje em formato YYYY-MM-DD.
 * @returns {string} A data de hoje.
 */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Atualiza o progresso diário do usuário.
 * @param {number} amount - A quantidade a adicionar ao progresso.
 * @returns {Promise<object>} O objeto de progresso diário atualizado.
 */
export async function updateDailyProgress(amount: number) {
  const user = await get("user", "main");

  const date = today();

  let daily = user?.daily || {
    date,
    progress: 0,
    goal: 5,
    completed: false,
  };

  if (daily.date !== date) {
    daily = {
      date,
      progress: 0,
      goal: 5,
      completed: false,
    };
  }

  daily.progress += amount;

  if (daily.progress >= daily.goal) {
    daily.completed = true;
  }

  await save("user", {
    ...user,
    daily,
  });

  return daily;
}