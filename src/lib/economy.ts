import { get, save } from "@/lib/db";

export async function addCoins(amount: number) {
  const user = await get("user", "main");

  const coins = (user?.coins || 0) + amount;

  await save("user", { ...user, coins });

  return coins;
}

export async function spendCoins(amount: number) {
  const user = await get("user", "main");

  if ((user?.coins || 0) < amount) return false;

  await save("user", {
    ...user,
    coins: user.coins - amount,
  });

  return true;
}