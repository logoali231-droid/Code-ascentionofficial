"use client";

import { generateCourse } from "./courseGenerator";
import { validateCourse } from "./courseValidator";
import { cleanAndParseCourseJSON } from "./safeParse";


export async function streamCourseGeneration(params: any) {
  let fullResponse = "";

  try {
    // 1. Aciona o gerador neural configurado para streaming nativo
    const rawRes = await generateCourse({ ...params, stream: true });

    if (rawRes) {
      if (typeof rawRes === "string") {
        fullResponse = rawRes;
      } else {
        // 2. Consome os pedaços (chunks) em tempo real conforme são computados na WebGPU
        for await (const chunk of rawRes) {
          const content = typeof chunk === "string"
            ? chunk
            : (chunk as any).choices?.[0]?.delta?.content || "";

          const chunks: string[] = [];

          chunks.push(content);

          if (chunks.length > 200) break;

          const fullResponse = chunks.join("");;

          // Opcional: Dispare um eventBus aqui se quiser renderizar o progresso do texto na interface!
          // eventBus.emit(EventType.COURSE_STREAM_CHUNK, content);
        }
      }
    }
  } catch (err) {
    console.error("[STREAM:GENERATION:FAILED] Falha na esteira de inferência local:", err);
  }

  // 3. Aplica a nova limpeza heurística inteligente
  const parsed = cleanAndParseCourseJSON(fullResponse);

  if (!parsed || !validateCourse(parsed)) {
    console.warn("[FALLBACK:ACTIVATED] Ativando malha adaptativa de contingência.");

    // Fallback Adaptativo Avançado (Evita parecer estático ou genérico)
    return {
      title: `${params.topic} - Estrutura de Estabilidade`,
      description: `Não foi possível mapear a árvore neural complexa para ${params.topic}. Fornecendo módulos estruturais básicos ajustados para o seu nível de aprendizado.`,
      tags: [params.topic.toLowerCase(), "contingencia"],
      lessons: [
        {
          title: `Introdução Fundamental a ${params.topic}`,
          summary: "Abordagem dos conceitos primitivos e mapeamento de dependências iniciais.",
          difficulty: 1,
        },
        {
          title: `Prática Isolada e Arquitetura de Contexto`,
          summary: "Exercícios guiados no Sandbox para fixação da sintaxe essencial.",
          difficulty: 2,
        }
      ],
    };
  }

  return parsed;
}
