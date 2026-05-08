/**
 * src/lib/lessonGenerator.ts
 * Implementação de Fluxo Infinito e Geração em Background
 */
import { generate } from "./webllm";
import { safeParse } from "./safeParse";
import { buildCoursePrompt } from "./aiPrompt";
import { getRecord, saveRecord } from "./db";

export async function generateLessons(config: any) {
  const prompt = buildCoursePrompt(config);
  const raw = await generate(prompt);
  const parsed = safeParse(raw);
  
  if (!parsed) throw new Error("AI returned invalid JSON");
  return parsed;
}

/**
 * ENSURE NEXT LESSONS (Infinite Loop)
 * Verifica se o usuário tem poucas lições restantes e gera mais se necessário.
 */
export async function ensureNextLessons(courseId: string) {
  const course = await getRecord("courses", courseId);
  if (!course) return;

  const currentIndex = course.currentIndex || 0;
  const lessons = course.lessons || [];
  
  // Se faltarem apenas 2 lições para acabar o bloco atual, gera mais 3
  if (lessons.length - currentIndex <= 2) {
    console.log("Sinal de 'Poucas Lições' detectado. Gerando reforço procedural...");

    const lastLesson = lessons[lessons.length - 1];
    
    // Customizamos o config para focar na continuidade
    const configWithContext = {
      ...course.config,
      isExtension: true, // Flag para o prompt saber que é continuação
      lastTopic: lastLesson?.title || course.config.topic,
      count: 3
    };

    try {
      const newLessons = await generateLessons(configWithContext);
      
      // Merge das lições antigas com as novas
      const updatedCourse = {
        ...course,
        lessons: [...lessons, ...newLessons]
      };

      await saveRecord("courses", updatedCourse, courseId);
      console.log("Novas lições injetadas com sucesso.");
    } catch (error) {
      console.error("Falha na geração procedural:", error);
    }
  }
}