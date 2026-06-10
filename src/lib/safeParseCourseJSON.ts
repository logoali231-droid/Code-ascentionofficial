import { CourseSchema } from "./ai/contracts/aiContract";

export function cleanAndParseCourseJSON(raw: string) {
  try {
    const json = JSON.parse(raw);

    // validação estrutural mínima
    if (!json.title || !Array.isArray(json.modules)) {
      return null;
    }

    // normalização forte
    return {
      title: String(json.title),
      description: String(json.description || ""),
      tags: Array.isArray(json.tags) ? json.tags : [],
      modules: json.modules.map((m: any, i: number) => ({
        id: m.id || `module_${i}`,
        title: String(m.title),
        summary: String(m.summary).slice(0, 120),
        difficulty: Math.min(5, Math.max(1, Number(m.difficulty || 1))),
        generated: false,
        completed: false,
        locked: false,
      })),
    };
  } catch {
    return null;
  }
}