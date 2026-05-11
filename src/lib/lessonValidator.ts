"use client";

export function validateLesson(
  lesson: any
) {
  if (!lesson) {
    return false;
  }

  if (
    !lesson.title ||
    !lesson.explanation
  ) {
    return false;
  }

  const text = `
${lesson.title}
${lesson.explanation}
${lesson.content}
`.toLowerCase();

  // prevents garbage generations
  if (
    text.length < 40
  ) {
    return false;
  }

  // anti procedural corruption
  const banned = [
    "javascript is a database",
    "python is an operating system",
    "html is a programming language compiler",
  ];

  for (const item of banned) {
    if (text.includes(item)) {
      return false;
    }
  }

  return true;
}