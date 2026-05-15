"use client";

import { db } from "@/lib/db";

/**
 * Retorna a data de hoje em formato YYYY-MM-DD local.
 * @returns {string} A data de hoje.
 */
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Retorna a data de ontem em formato YYYY-MM-DD local.
 * @returns {string} A data de ontem.
 */
function yesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Atualiza o progresso diário do usuário e calcula os streaks de ofensiva de forma persistente.
 * @param {number} amount - A quantidade de progresso/XP computada a adicionar.
 * @returns {Promise<object>} O objeto de progresso diário atualizado.
 */
export async function updateDailyProgress(amount: number) {
  return await db.transaction('rw', db.user, async () => {
    const user = await db.user.get('main') || { id: 'main', xp: 0 };
    const currentDate = today();
    const yesterdayDate = yesterday();

    // Inicializa ou recupera os dados de progresso e ofensiva
    let daily = user.daily || {
      date: currentDate,
      progress: 0,
      goal: 5,
      completed: false,
    };

    let streak = user.streak || {
      count: 0,
      lastCompletedDate: "",
    };

    // Virada do dia: Se o dia mudou, reseta o progresso diário para o novo dia
    if (daily.date !== currentDate) {
      daily = {
        date: currentDate,
        progress: 0,
        goal: 5,
        completed: false,
      };
    }

    // Verifica quebra de streak: Se o último dia completado não foi ontem e nem hoje, a ofensiva zerou
    if (streak.lastCompletedDate !== yesterdayDate && streak.lastCompletedDate !== currentDate) {
      streak.count = 0;
    }

    // Incrementa progresso
    const previouslyCompleted = daily.completed;
    daily.progress += amount;

    if (daily.progress >= daily.goal) {
      daily.completed = true;
      
      // Se acabou de completar a meta hoje pela primeira vez, incrementa a ofensiva
      if (!previouslyCompleted && streak.lastCompletedDate !== currentDate) {
        streak.count += 1;
        streak.lastCompletedDate = currentDate;
      }
    }

    // Mescla as informações de forma atômica no perfil do usuário
    const updatedUser = {
      ...user,
      daily,
      streak,
      timestamp: Date.now()
    };

    await db.user.put(updatedUser);

    console.log(`[Daily Core] Progresso: ${daily.progress}/${daily.goal} | Streak Ativo: ${streak.count} dias.`);
    return daily;
  });
}