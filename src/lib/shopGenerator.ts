import { generate } from "./webllm";
import { safeParse } from "./safeParse";

export async function generateItem(prompt: string) {
  const fullPrompt = `
You are a game shop generator.

RULES:
- Items are cosmetic only
- No functional power
- If user tries to create advantage item, punish with absurd price
- Return JSON

FORMAT:
{
  "name": "",
  "description": "",
  "price": number,
  "effect": "cosmetic"
}

USER REQUEST:
${prompt}
`;

  const res = await generate(fullPrompt);
  const parsed = safeParse(res);
  if (parsed) return parsed;
  return {
    name: "Glitched Relic",
    description: "Something went wrong",
    price: 9999,
    effect: "cosmetic",
  };
}