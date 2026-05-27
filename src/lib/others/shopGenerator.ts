import { cleanAndParseCourseJSON } from "./safeParse";

// Defina o tipo esperado do retorno da IA
type LLMResponse = string | AsyncIterable<any>;

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

  // Agora garantimos que rawRes tem um tipo válido
  const rawRes: LLMResponse = await generate(fullPrompt);

  let res = "";
  if (rawRes) {
    if (typeof rawRes === "string") {
      res = rawRes;
    } else {
      // Agora o TS reconhece rawRes como AsyncIterable
      for await (const chunk of rawRes) {
        const content =
          typeof chunk === "string"
            ? chunk
            : (chunk as any).choices?.[0]?.delta?.content || "";
        res += content;
      }
    }
  }

  const parsed = cleanAndParseCourseJSON(res);
  if (parsed) return parsed;

  return {
    name: "Glitched Relic",
    description: "Something went wrong in the matrix",
    price: 9999,
    effect: "cosmetic",
  };
}

async function generate(_fullPrompt: string): Promise<LLMResponse> {
  throw new Error("Function not implemented.");
}