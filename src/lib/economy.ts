"use client";

import { get, save } from "@/lib/db";

export async function addCoins(amount: number) {
  const user = await get("user", "main");

  const updated = {
    ...user,
    coins: (user?.coins || 0) + amount,
  };

  await save("user", updated);
}

export async function buyItem(item: any) {
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