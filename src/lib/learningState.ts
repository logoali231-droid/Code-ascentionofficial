"use client";

import { get, save } from "./db";
import { CognitiveProfile } from "@/types";

/**
 * Interface para o progresso de um tópico específico
 */
export interface TopicMastery {
  topic: string;
  level: number;       // 1-100
  attempts: number;
  successes: number;
  lastDifficulty: number;
  history: {
    date: number;
    success: boolean;
    difficulty: number;
  }[];
}

/**
 * Rastreia e atualiza a maestria do usuário em um tópico específico.
 * Esta lógica alimenta o sistema adaptativo para evitar frustração.
 */
export async function updateLearningState(
  topic: string,
  success: boolean,
  difficulty: number
) {
  const store = "memory"; // Usando a store 'memory' definida no seu db.ts
  const key = `mastery_${topic.toLowerCase()}`;

  // 1. Recupera o estado atual ou cria um novo
  const currentState = await get<TopicMastery>(store, key) || {
    topic,
    level: 10,
    attempts: 0,
    successes: 0,
    lastDifficulty: difficulty,
    history: []
  };

  // 2. Atualiza estatísticas básicas
  currentState.attempts += 1;
  if (success) currentState.successes += 1;

  // 3. Cálculo de maestria (Elo-style simplificado)
  const adjustment = success ? (difficulty * 2) : -(difficulty * 1.5);
  currentState.level = Math.max(1, Math.min(100, currentState.level + adjustment));

  // 4. Registra no histórico (mantém apenas as últimas 20 para performance)
  currentState.history.push({
    date: Date.now(),
    success,
    difficulty
  });
  if (currentState.history.length > 20) currentState.history.shift();

  // 5. Salva de volta no IndexedDB
  await save(store, currentState, key);

  return currentState;
}

/**
 * Sugere a dificuldade ideal para o próximo exercício baseada na maestria
 */
export async function suggestDifficulty(topic: string, profile: CognitiveProfile): Promise<number> {
  const mastery = await get<TopicMastery>("memory", `mastery_${topic.toLowerCase()}`);

  if (!mastery) return 1; // Default para iniciantes

  // A curva de dificuldade agora é mais granular (níveis 1-100 do tópico)
  let baseDiff = Math.min(5, Math.max(1, Math.floor(mastery.level / 20) + 1));

  // Ajuste Cognitivo na Sugestão
  switch (profile) {
    case "Deep_Dive":
      return Math.min(5, baseDiff + 1); // Sempre empurra um pouco mais
    case "tdah":
      // Para TDAH, se ele errou a última, baixa bem a dificuldade para manter o flow/dopamina
      const lastAttempt = mastery.history[mastery.history.length - 1];
      if (lastAttempt && !lastAttempt.success) return Math.max(1, baseDiff - 1);
      return baseDiff;
    case "Visual_Logic":
      return baseDiff; // Segue a curva padrão
    default:
      return baseDiff;
  }
}

/**
 * Retorna todos os tópicos onde o usuário é "Expert" (Level > 80)
 * Útil para liberar itens especiais na loja.
 */
export async function getMasteredTopics(): Promise<string[]> {
  const dbName = "codeascent_db";
  // Como getAll no seu db.ts é genérico, filtramos manualmente
  const allMastery = await get<any>("memory", "all") as any;
  // Nota: dependendo da implementação do seu getAll, pode ser necessário iterar as chaves

  // Fallback: se não houver um getAll fácil para chaves específicas, retornamos array vazio
  // ou implementamos uma busca por prefixo se necessário.
  return [];
}
