/**
 * src/lib/lessonGenerator.ts
 * Implementação de Fluxo Infinito e Geração em Background
 */
import { generate } from "./webllm";
import { safeParse } from "./safeParse";
import { buildCoursePrompt } from "./aiPrompt";
import { getRecord, saveRecord } from "./db";

/**
 * Gera lições isoladas baseadas na configuração fornecida.
 */
export async function generateLessons(config: any) {
  const prompt = buildCoursePrompt(config);
  const raw = await generate(prompt);
  const parsed = safeParse(raw);
  
  if (!parsed || !parsed.lessons) {
    throw new Error("AI returned invalid JSON or missing lessons array");
  }
  
  return parsed.lessons; // Retorna apenas o array de lições
}

/**
 * ENSURE NEXT LESSONS (Infinite Loop)
 * Verifica o progresso e gera reforço procedural preventivamente.
 */
export async function ensureNextLessons(courseId: string) {
  const course = await getRecord("courses", courseId);
  if (!course) return;

  const currentIndex = course.currentIndex || 0;
  const lessons = course.lessons || [];
  
  // TRIGGER: Se restarem apenas 2 lições para o fim da lista atual
  if (lessons.length - currentIndex <= 2) {
    console.log("Sinal de 'Poucas Lições' detectado. Expandindo curso...");

    const lastLesson = lessons[lessons.length - 1];
    
    const configWithContext = {
      ...course.config,
      isExtension: true, // Avisa ao prompt que é uma continuação
      lastTopic: lastLesson?.title || course.config.topic,
      count: 3
    };

    try {
      // Gera as novas lições
      const newLessons = await generateLessons(configWithContext);
      
      // Concatena mantendo a estrutura íntegra
      const updatedCourse = {
        ...course,
        lessons: [...lessons, ...newLessons],
        updatedAt: Date.now()
      };

      await saveRecord("courses", updatedCourse, courseId);
      console.log(`Sucesso: +${newLessons.length} lições injetadas no curso.`);
    } catch (error) {
      console.error("Falha na geração procedural em background:", error);
    }
  }
}