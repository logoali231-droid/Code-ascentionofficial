"use client";

import { generate } from "@/lib/others/webllm";
import { safeParse } from "@/lib/others/safeParse";
import { InventoryItem } from "@/types/core";

/**
 * SHOP AI - Módulo de Geração e Lógica de Negócios
 * Integrado com Web Workers para performance máxima.
 */

// --- FUNÇÕES DE LÓGICA (EXPORTADAS PARA O WORKER) ---

/**
 * Calcula o desconto baseado na facção do usuário.
 */
export function calculateDiscount(
  price: number,
  faction: string = "neutral",
): number {
  const discounts: Record<string, number> = {
    cyber_syndicate: 0.15, // 15% OFF
    neural_nexus: 0.1, // 10% OFF
  };
  const multiplier = 1 - (discounts[faction] || 0);
  return Math.floor(price * multiplier);
}

/**
 * Processa a adição de itens garantindo unicidade para chips.
 */
export function processInventory(
  currentItems: InventoryItem[],
  newItem: InventoryItem,
): InventoryItem[] {
  // Chips são únicos, boosters e outros podem acumular
  if (
    newItem.type === "chip" &&
    currentItems.some((i) => i.id === newItem.id)
  ) {
    return currentItems;
  }

  return [...currentItems, { ...newItem, acquiredAt: Date.now() }];
}

// --- LÓGICA DE GERAÇÃO DE ITENS VIA IA ---

/**
 * Avalia a intenção do usuário para evitar itens "apelões".
 * Se o poder for muito alto, o item se torna "Fake" (cosmético).
 */
const evaluateIntent = (prompt: string): number => {
  let powerLevel = 1;
  const triggers: Record<string, number> = {
    x2: 2,
    x3: 3,
    x5: 5,
    infinite: 10,
    god: 10,
    hack: 8,
    rich: 5,
    admin: 10,
    instant: 4,
    max: 6,
  };

  const lowerPrompt = prompt.toLowerCase();
  Object.keys(triggers).forEach((key) => {
    if (lowerPrompt.includes(key)) powerLevel += triggers[key];
  });

  return powerLevel;
};

/**
 * Gera um item customizado usando o modelo de linguagem local (WebLLM).
 */
export async function generateAIItem(
  userPrompt: string,
): Promise<InventoryItem> {
  const power = evaluateIntent(userPrompt);

  // Prompt de sistema rigoroso para garantir JSON válido e ambientação Cyberpunk
  const systemPrompt = `You are the Black Market AI. The user wants: "${userPrompt}". 
  Create a cyberpunk item in JSON format:
  {
    "name": "Short Name",
    "description": "Flavor text",
    "icon": "One emoji",
    "effect": "one_word_effect"
  }
  Respond ONLY with the JSON block.`;

  const response = await generate(systemPrompt);
  let rawText = "";

  // Lida com a resposta sendo String ou Stream
  if (response) {
    if (typeof response === "string") {
      rawText = response;
    } else {
      for await (const chunk of response as any) {
        const content = chunk.choices?.[0]?.delta?.content || "";
        rawText += content;
      }
    }
  }

  const parsed = safeParse(rawText);

  // Anti-Cheat: Se o usuário pediu algo absurdo (power >= 8), o item é uma "falsificação"
  // Ele tem nome e ícone épicos, mas o efeito interno é "cosmetic" (não dá bônus real)
  const isFake = power >= 8;

  return {
    id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    name: parsed?.name || "Glitched Data",
    description: isFake
      ? `[MALWARE DETECTED] ${parsed?.description || "A counterfeit item."}`
      : parsed?.description || "An unstable artifact from the deep web.",
    icon: parsed?.icon || "☢️",
    effect: isFake ? "cosmetic" : parsed?.effect || "minor_boost",
    effectValue: isFake ? 0 : Math.min(power * 5, 50),
    price: Math.floor(100 * Math.pow(power, 1.5)),
    rarity: power > 9 ? "Legendary" : power > 6 ? "Epic" : "Rare",
    type: "custom",
    requiredLevel: Math.min(Math.floor(power / 2), 10),
    quantity: 1,
    acquiredAt: 0,
    // @ts-ignore - Propriedade extra para controle interno da UI
    fake: isFake,
  };
}
