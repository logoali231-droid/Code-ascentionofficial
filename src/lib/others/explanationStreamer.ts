"use client";

import { generateExplanationAI, explainError } from "./explanationAI";
import { cleanAndParseCourseJSON } from "./safeParse";
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

  const parsed = cleanAndParseCourseJSON(fullText);

  if (parsed && (await validateExplanation(parsed))) {
    return parsed;
  }

  // Retorno controlado se a IA violar o Filtro Anti-Cortex
  return {
    title: "⚠️ LINK ANÔMALO DETECTADO",
    content: "O output gerado pela rede neural violou os seus filtros restritivos de sintaxe configurados no perfil.",
    analogy: "Filtro de segurança ativado pelo Operador."
  };
}

export async function streamErrorExplanation(params: any) {
  const rawRes = await explainError(params);
  let fullText = "";

  if (rawRes) {
    if (typeof rawRes === "string") {
      fullText = rawRes;
    } else {
      for await (const chunk of rawRes) {
        fullText += typeof chunk === "string" ? chunk : (chunk as any).choices?.[0]?.delta?.content || "";
      }
    }
  }

  const parsed = cleanAndParseCourseJSON(fullText);
  // Validação estrita injetada também no fluxo do Debugger de Erros
  if (parsed && !(await validateExplanation(parsed))) {
    return "⚠️ CORRUPÇÃO DE DADOS: O debugger gerou explicações contendo termos bloqueados pelas suas diretivas de segurança.";
  }

  return fullText;
}
