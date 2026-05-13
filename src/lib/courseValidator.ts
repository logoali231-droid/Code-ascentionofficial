"use client";

export function validateCourse(course: any) {
  if (!course || !course.lessons || !Array.isArray(course.lessons)) {
    return false;
  }

  // Verifica se o curso tem pelo menos uma introdução
  if (course.lessons.length === 0) return false;

  // Impede cursos vazios ou com títulos genéricos demais
  if (course.title.length < 5) return false;

  // Checagem de progressão de dificuldade
  let lastDifficulty = 0;
  for (const lesson of course.lessons) {
    if (!lesson.title || !lesson.summary) return false;
    
    // Se a dificuldade pular de 1 para 5 direto, o curso está mal projetado
    if (lesson.difficulty - lastDifficulty > 3) return false;
    lastDifficulty = lesson.difficulty;
  }

  return true;
}
