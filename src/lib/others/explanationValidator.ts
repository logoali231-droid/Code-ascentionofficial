"use client";

import { get } from "./db";

export async function validateExplanation(
  data: any,
): Promise<boolean> {
  if (!data) {
    return false;
  }

  // Permite resposta direta em markdown/texto
  if (
    typeof data === "string" &&
    data.trim().length > 40
  ) {
    return true;
  }

  // Precisa ser um objeto
  if (
    typeof data !== "object" ||
    data === null
  ) {
    return false;
  }

  // Deve possuir pelo menos um campo textual relevante
  if (
    !data.title &&
    !data.content &&
    !data.explanation
  ) {
    return false;
  }

  // Junta corretamente todos os textos disponíveis
  const text = `
${data.title ?? ""}
${data.content ?? ""}
${data.explanation ?? ""}
${data.analogy ?? ""}
${data.fix ?? ""}
${data.keyTakeaway ?? ""}
`
    .toLowerCase()
    .trim();

  // Muito curto = provavelmente geração inválida
  if (text.length < 20) {
    return false;
  }

  // Busca termos banidos customizados
  const user = await get("user", "main");
  const customBanned = user?.customBanned || [];

  // Anti-corrupção procedural
  const banned = [
    "javascript is a database",
    "html is a compiler",
    ...customBanned,
  ];

  for (const item of banned) {
    if (
      text.includes(
        String(item).toLowerCase(),
      )
    ) {
      return false;
    }
  }

  return true;
}
