"use client";

export type ShopItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  effect: string;
  icon: string;
  requiredLevel?: number;
  requiredStreak?: number;
  fake?: boolean;
};

export const baseItems: ShopItem[] = [
  {
    id: "potion_x2",
    name: "Potion x2",
    description: "Double XP for next lesson",
    price: 120,
    effect: "double_xp",
    icon: "⚗️",
    requiredLevel: 2,
  },
  {
    id: "vault_skin",
    name: "Obsidian Vault",
    description: "Pure style",
    price: 90,
    effect: "cosmetic",
    icon: "🧱",
    requiredStreak: 3,
  },
];