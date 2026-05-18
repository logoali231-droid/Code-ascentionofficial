"use client";

import { generateCourse } from "./courseGenerator";
import { safeParse } from "./safeParse";
import { validateCourse } from "./courseValidator";

export async function streamCourseGeneration(params: any) {
  // 1. Chama sua função de prompt (generateCourse)
  const rawRes = await generateCourse(params);

  let fullResponse = "";

  // 2. Coletor Neural (Balde de Stream)
  if (rawRes) {
    if (typeof rawRes === "string") {
      fullResponse = rawRes;
    } else {
      for await (const chunk of rawRes) {
        const content =
          typeof chunk === "string"
            ? chunk
            : (chunk as any).choices?.[0]?.delta?.content || "";
        fullResponse += content;
      }
    }
  }

  // 3. Parse e Validação
  const parsed = safeParse(fullResponse);

  if (!parsed || !validateCourse(parsed)) {
    // Fallback de Emergência se o Arquiteto falhar
    return {
      title: `${params.topic} - Recovery Path`,
      description:
        "Neural architecture failed. Providing emergency stability modules.",
      lessons: [
        {
          title: `Core Concepts of ${params.topic}`,
          summary: "Fundamentals and essential logic.",
          difficulty: 1,
        },
      ],
    };
  }

  return parsed;
}
