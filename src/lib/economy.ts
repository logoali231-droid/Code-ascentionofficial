"use client";

import { get, save } from "@/lib/db";

/**
 * Adiciona moedas ao usuário.
 * @param {number} amount - A quantidade de moedas a adicionar.
 * @returns {Promise<void>}
 */
export async function addCoins(amount: number) {
  const user = await get("user", "main");

  const updated = {
    ...user,
    coins: (user?.coins || 0) + amount,
  };

  await save("user", updated);
}

/**
 * Permite ao usuário comprar um item.
 * @param {any} item - O item a ser comprado.
 * @returns {Promise<void>} Lança erro se não puder comprar.
 */
export async function buyItem(item: any) {

  if (item.fake) {
    // compra permitida, mas não dá benefício
    console.log("User bought fake item");
  }
  const user = await get("user", "main");

  const level = Math.floor((user?.xp || 0) / 100);

  if (item.requiredLevel && level < item.requiredLevel) {
    throw new Error("Level too low");
  }

  if (item.requiredStreak && (user?.streak || 0) < item.requiredStreak) {
    throw new Error("Streak too low");
  }

  if (user?.coins < item.price) {
    throw new Error("Not enough coins");
  }

  user.coins -= item.price;

  user.inventory = [...(user.inventory || []), item];

  await save("user", user);
}