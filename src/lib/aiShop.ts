"use client";

import { generate } from "@/lib/webllm";
import { safeParse } from "@/lib/safeParse";

// --- FUNÇÕES EXPORTADAS PARA O WORKER ---

export function calculateDiscount(price: number, faction: string = "neutral"): number {
  const discounts: Record<string, number> = { "cyber_syndicate": 0.15, "neural_nexus": 0.10 };
  return Math.floor(price * (1 - (discounts[faction] || 0)));
}

export function processInventory(currentItems: any[], newItem: any) {
  if (newItem.type === "chip" && currentItems.some(i => i.id === newItem.id)) return currentItems;
  return [...currentItems, { ...newItem, acquiredAt: Date.now() }];
}

// --- LÓGICA DE GERAÇÃO DE ITENS IA ---

const evaluateIntent = (t: string) => {
  let p = 1;
  const checks: Record<string, number> = { "x2": 2, "x3": 3, "x5": 5, "infinite": 6, "god": 6, "hack": 4 };
  Object.keys(checks).forEach(k => { if (t.toLowerCase().includes(k)) p += checks[k]; });
  return p;
};

export async function generateAIItem(userPrompt: string) {
  const power = evaluateIntent(userPrompt);
  const aiPrompt = `User wants: ${userPrompt}\nCreate item JSON:\n{ "name": "", "description": "", "icon": "emoji", "effect": "boost" }\nKeep balanced.`;

  const response = await generate(aiPrompt);
  let rawText = "";

  if (response) {
    if (typeof response === 'string') rawText = response;
    else for await (const chunk of response) {
      rawText += typeof chunk === 'string' ? chunk : (chunk as any).choices?.[0]?.delta?.content || "";
    }
  }

  const parsed = safeParse(rawText);
  const fake = power >= 7;

  return {
    id: `ai_${Date.now()}`,
    name: parsed?.name || "Glitched Relic",
    description: parsed?.description || "Something unstable...",
    icon: parsed?.icon || "🧪",
    effect: fake ? "cosmetic" : parsed?.effect || "cosmetic",
    price: Math.floor(80 * Math.pow(power, 2)),
    rarity: power > 8 ? "Legendary" : power > 5 ? "Epic" : "Rare",
    type: "custom",
    requiredLevel: Math.min(power, 6),
    fake,
  };
}
