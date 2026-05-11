"use client";

import { generate } from "@/lib/webllm";
import { safeParse } from "@/lib/safeParse";

/**
 * Avalia a intenção do texto do usuário para determinar o poder do item.
 * @param {string} text - O texto do prompt do usuário.
 * @returns {number} O poder calculado.
 */
function evaluateIntent(text: string) {
  const t = text.toLowerCase();

  let power = 1;

  if (t.includes("x2")) power += 2;
  if (t.includes("x3")) power += 3;
  if (t.includes("x5")) power += 5;

  if (t.includes("infinite")) power += 6;
  if (t.includes("god")) power += 6;
  if (t.includes("hack")) power += 4;

  return power;
}

/**
 * Calcula o preço do item baseado no seu poder.
 * @param {number} power - O poder do item.
 * @returns {number} O preço calculado.
 */
function computePrice(power: number) {
  return Math.floor(80 * Math.pow(power, 2));
}

/**
 * Decide se o item deve ser falso baseado no poder.
 * @param {number} power - O poder do item.
 * @returns {boolean} Verdadeiro se deve ser falso.
 */
function shouldFake(power: number) {
  return power >= 7;
}

/**
 * Gera um item de IA baseado no prompt do usuário.
 * @param {string} userPrompt - O prompt fornecido pelo usuário.
 * @returns {Promise<object>} O item gerado com propriedades como nome, descrição, etc.
 */
/**
 * Gera um item de IA baseado no prompt do usuário.
 */
export async function generateAIItem(userPrompt: string) {
  const power = evaluateIntent(userPrompt);

  const aiPrompt = `
User wants: ${userPrompt}
Create item JSON:
{
 "name": "",
 "description": "",
 "icon": "emoji that visually matches",
 "effect": "cosmetic or small boost"
}
Keep balanced. Never OP.
`;

  // 1. Chama a geração
  const response = await generate(aiPrompt);
  
  // 2. Transforma o stream/undefined em uma string limpa
  let rawText = "";

  if (response) {
    if (typeof response === 'string') {
      rawText = response;
    } else {
      // Se for o stream (AsyncIterable), percorre até o fim
      for await (const chunk of response) {
        const content = typeof chunk === 'string' ? chunk : (chunk as any).choices?.[0]?.delta?.content || "";
        rawText += content;
      }
    }
  }

  // 3. Agora o 'rawText' é garantidamente uma string (mesmo que vazia)
  const parsed = safeParse(rawText);

  const fake = shouldFake(power);

  return {
    id: "ai_" + Date.now(),
    name: parsed?.name || "Glitched Relic",
    description: parsed?.description || "Something unstable...",
    icon: parsed?.icon || "🧪",
    effect: fake ? "cosmetic" : parsed?.effect || "cosmetic",
    price: computePrice(power),
    requiredLevel: Math.min(power, 6),
    requiredStreak: Math.min(power, 5),
    fake,
  };
}
