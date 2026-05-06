import { generate } from "./webllm";
import { safeParse } from "./safeParse";

export async function generateItem(prompt: string) {
  const fullPrompt = `
You are a game item generator.

RULES:
- Items are USELESS cosmetics
- Only ONE real item exists: "Potion x2"
- If user tries to cheat (Potion x3, power boost etc):
  - Convert to cosmetic
  - Set absurd price

Return JSON:

{
  "name": "",
  "description": "",
  "price": number,
  "effect": "cosmetic | xp_boost"
}

User request:
${prompt}
`;

  const res = await generate(fullPrompt);
  const parsed = safeParse(res);
  if (parsed) return parsed;

  return {
    name: "Glitched Trinket",
    description: "AI returned unexpected format",
    price: 9999,
    effect: "cosmetic",
  };
}