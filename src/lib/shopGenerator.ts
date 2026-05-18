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

  // 1. Pega o retorno bruto (pode vir como Stream do WebLLM)
  const rawRes = await generate(fullPrompt);

  // 2. Coletor Neural: Transforma Stream em String única
  let res = "";
  if (rawRes) {
    if (typeof rawRes === "string") {
      res = rawRes;
    } else {
      // Consome o stream pedaço por pedaço para não travar o Samsung M23
      for await (const chunk of rawRes) {
        const content =
          typeof chunk === "string"
            ? chunk
            : (chunk as any).choices?.[0]?.delta?.content || "";
        res += content;
      }
    }
  }

  // 3. Agora o 'res' é garantidamente uma string para o safeParse
  const parsed = safeParse(res);

  if (parsed) return parsed;

  /* =========================================
     FALLBACK
  ========================================= */
  return {
    name: "Glitched Relic",
    description: "Something went wrong in the matrix",
    price: 9999,
    effect: "cosmetic",
  };
}
