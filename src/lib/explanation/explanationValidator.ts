"use client";

export function validateExplanation(data: any) {
  if (!data) return false;

  // Se a IA retornar uma string direta (markdown) em vez de JSON
  if (typeof data === 'string' && data.length > 40) return true;

  // Se for objeto (padrão JSON)
  if (data.explanation || data.content || data.title) {
    const text = (data.explanation || "" + data.content || "").toLowerCase();
    
    // Anti-corrupção procedural
    const banned = ["javascript is a database", "html is a compiler"];
    for (const item of banned) {
      if (text.includes(item)) return false;
    }
    return text.length > 20;
  }

  return false;
}
