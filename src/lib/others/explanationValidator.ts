"use client";

import { get } from "./db";

export async function validateExplanation(data: any) {
  if (!data) return false;

  // Se a IA retornar uma string direta (markdown) em vez de JSON
  if (typeof data === "string" && data.length > 40) return true;

  // Se for objeto (padrão JSON)
  if (data.explanation || data.content || data.title) {
    const text = (data.explanation || "" + data.content || "").toLowerCase();

    // Busca os termos banidos customizados pelo usuário no banco
    const user = await get("user", "main");
    const customBanned = user?.customBanned || [];

    // Anti-corrupção procedural base + dinâmicos
    const banned = [
      "javascript is a database", 
      "html is a compiler",
      ...customBanned
    ];

    for (const item of banned) {
      if (text.includes(item.toLowerCase())) return false;
    }
    
    return text.length > 20;
  }

  return false;
}
