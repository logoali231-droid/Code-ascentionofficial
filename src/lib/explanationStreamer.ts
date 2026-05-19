"use client";

import { generateExplanationAI, explainError } from "./explanationAI";
import { safeParse } from "./safeParse";
import { validateExplanation } from "./explanationValidator";

export async function streamExplanation(params: any) {
  // Chama o gerador que você já tem
  const rawRes = await generateExplanationAI(params);

  let fullText = "";

  if (rawRes) {
    if (typeof rawRes === "string") {
      fullText = rawRes;
    } else {
      for await (const chunk of rawRes) {
        const content =
          typeof chunk === "string"
            ? chunk
            : (chunk as any).choices?.[0]?.delta?.content || "";
        fullText += content;
      }
    }
  }

  const parsed = safeParse(fullResponse);

    // ADICIONADO o await aqui, pois a validação agora lê o IndexedDB
    if (!parsed || !(await validateExplanation(parsed))) {
      console.warn("Explanation validation failed or parse error.");

  return fullText || "Mentor system offline. Critical link failure.";
}

export async function streamErrorExplanation(params: any) {
  const rawRes = await explainError(params);
  let fullText = "";

  if (rawRes) {
    if (typeof rawRes === "string") {
      fullText = rawRes;
    } else {
      for await (const chunk of rawRes) {
        fullText +=
          typeof chunk === "string"
            ? chunk
            : (chunk as any).choices?.[0]?.delta?.content || "";
      }
    }
  }

  return fullText;
}
