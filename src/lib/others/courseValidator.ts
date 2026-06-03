"use client";

export function validateCourse(course: any): boolean {
  if (!course || typeof course !== "object") {
    return false;
  }

  /* =========================
     REQUIRED ROOT FIELDS
  ========================= */

  if (
    typeof course.title !== "string" ||
    course.title.trim().length < 5
  ) {
    return false;
  }

  if (
    typeof course.description !== "string" ||
    course.description.trim().length === 0
  ) {
    return false;
  }

  if (!Array.isArray(course.tags)) {
    return false;
  }

  /* =========================
     MODULE VALIDATION
  ========================= */

  if (
    !Array.isArray(course.modules) ||
    course.modules.length === 0 ||
    course.modules.length > 8
  ) {
    return false;
  }

  let lastDifficulty = 0;

  for (const module of course.modules) {
    if (!module || typeof module !== "object") {
      return false;
    }

    if (
      typeof module.id !== "string" ||
      module.id.trim().length === 0
    ) {
      return false;
    }

    if (
      typeof module.title !== "string" ||
      module.title.trim().length === 0
    ) {
      return false;
    }

    if (
      typeof module.summary !== "string" ||
      module.summary.trim().length === 0
    ) {
      return false;
    }

    if (
      typeof module.difficulty !== "number" ||
      module.difficulty < 1 ||
      module.difficulty > 5
    ) {
      return false;
    }

    // Evita saltos absurdos
    if (
      lastDifficulty > 0 &&
      module.difficulty - lastDifficulty > 3
    ) {
      return false;
    }

    if (typeof module.generated !== "boolean") {
      return false;
    }

    if (typeof module.completed !== "boolean") {
      return false;
    }

    if (typeof module.locked !== "boolean") {
      return false;
    }

    lastDifficulty = module.difficulty;
  }

  return true;
}
