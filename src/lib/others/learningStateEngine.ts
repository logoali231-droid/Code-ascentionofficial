"use client";

import { getUser, db, save, get } from "./db";
import { getKnowledgeGraph, saveKnowledgeGraph, KnowledgeGraph, ConceptNode } from "./knowledgeGraph";
import { getMemory, Memory } from "./userMemory";
import { saveMemorySummary } from "./contextMemory";
import { getAdaptiveMetrics } from "./adaptive";

/**
 * CODE ASCENSION - LEARNING STATE ENGINE
 * SOBERANO CENTRAL: A única e absoluta fonte de verdade pedagógica do ecossistema.
 * Resolve a inconsistência convergindo dados operacionais, de grafo e adaptativos.
 */

export interface PedagogicalState {
  currentConcept: string;
  mastery: number;         // Estado unificado 0 a 1 do conceito corrente
  struggleLevel: number;   // Escala adaptativa contínua de atrito (0 a 1)
  pacing: "accelerated" | "normal" | "slow";
  cognitiveLoad: number;   // 0 a 1 mapeando saturação e exaustão
  reviewTargets: string[]; // Tópicos pendentes de reforço estruturado
  emotionalTone: "encouraging" | "challenging" | "rehabilitating" | "direct";
  verbosity: "concise" | "standard" | "dense";
}

export interface EngineExecutionResult {
  pedagogicalState: PedagogicalState;
  difficulty: number;
  xpAwarded: number;
  coinsAwarded: number;
  updatedNode: ConceptNode | null;
}

const ENGINE_STATE_PREFIX = "pedagogical_state_";

/**
 * Inicializa ou carrega o estado pedagógico soberano do curso
 */
export async function getOrCreatePedagogicalState(courseId: string, currentTopicId: string): Promise<PedagogicalState> {
  const stateKey = `${ENGINE_STATE_PREFIX}${courseId}`;
  const existing = await get("memory", stateKey);

  if (existing) return existing;

  const graph = await getKnowledgeGraph(courseId);
  const currentNode = graph?.nodes.find(n => n.id === currentTopicId);

  const defaultState: PedagogicalState = {
    currentConcept: currentTopicId,
    mastery: currentNode?.mastery || 0,
    struggleLevel: 0,
    pacing: "normal",
    cognitiveLoad: 0.1,
    reviewTargets: [],
    emotionalTone: "direct",
    verbosity: "standard"
  };

  await save("memory", defaultState, stateKey);
  return defaultState;
}

/**
 * PROCESS EVENT - O ponto de entrada unificado que remove a autonomia dos sub-módulos.
 * Modifica Grafo, Memória Histórica e Métricas Adaptativas em uma única transação atômica.
 */
// No início da função processPedagogicalEvent:
export interface PedagogicalPayload {
  success: boolean;
  attempts: number;
  errorType?: "conceptual" | "syntax" | "accidental" | string;
  executionTimeMs?: number;
  userOutput?: string;
}

export async function processPedagogicalEvent(
  courseId: string,
  conceptId: string,
  payload: PedagogicalPayload
): Promise<EngineExecutionResult> {
  const normalizedCourseId = courseId.toLowerCase().trim(); // Garante consistência de chaves
  const stateKey = `${ENGINE_STATE_PREFIX}${normalizedCourseId}`;

  // 1. Carrega todas as dependências em paralelo de forma limpa
  const [graph, rawMemory, currentState] = await Promise.all([
    getKnowledgeGraph(courseId),
    getMemory(),
    getOrCreatePedagogicalState(courseId, conceptId)
  ]);

  if (!graph) throw new Error(`[LearningStateEngine] KnowledgeGraph não encontrado para o curso: ${courseId}`);

  const node = graph.nodes.find(n => n.id === conceptId);
  if (!node) throw new Error(`[LearningStateEngine] Conceito ${conceptId} não localizado no grafo.`);

  // 2. Classificação precisa do Erro / Sucesso para evitar oscilações brutas
  let errorType = payload.errorType || "conceptual";
  if (!payload.success && payload.attempts === 1 && (payload.executionTimeMs || 0) < 4000) {
    errorType = "accidental"; // Erro rápido demais indica distração ou lag mobile
  }

  // 3. Atualização do Grafo de Conhecimento Base (Soberania de Cálculo)
  const previousMastery = node.mastery || 0;
  let masteryDelta = 0;

  if (payload.success) {
    // Escala decrescente de ganho baseado em tentativas para mitigar brute-force
    masteryDelta = payload.attempts === 1 ? 0.12 : payload.attempts === 2 ? 0.06 : 0.02;
  } else {
    // Erros operacionais/acidentais penalizam menos que lacunas conceituais profundas
    if (errorType === "conceptual") masteryDelta = -0.08;
    else if (errorType === "syntax") masteryDelta = -0.03;
    else masteryDelta = -0.01;
  }

  node.mastery = Math.max(0, Math.min(1, previousMastery + masteryDelta));
  node.completed = node.mastery >= 0.95;
  node.lastSeen = Date.now();
  if (!payload.success) node.timesReviewed = (node.timesReviewed || 0) + 1;

  // Atualiza as dependências de liberação do Grafo
  graph.nodes = graph.nodes.map(n => {
    if (n.id === node.id) return node;
    return {
      ...n,
      unlocked: n.prerequisites.length === 0 || n.prerequisites.every(req => {
        const reqNode = graph.nodes.find(f => f.id === req);
        return reqNode ? (reqNode.id === node.id ? (node.mastery ?? 0) >= 0.7 : (reqNode.mastery ?? 0) >= 0.7) : false;
      })
    };
  });

  // 4. Mutação Limpa da Memória Histórica de Usuário (Evitando Pântano Neural)
  const timestamp = Date.now();

  if (payload.success) {
    rawMemory.topics[conceptId] = (rawMemory.topics[conceptId] || 0) + 1;
    // Atenua a fraqueza de forma gradual se houver recuperação real
    if (rawMemory.weaknesses[conceptId]) {
      rawMemory.weaknesses[conceptId] = Math.max(0, rawMemory.weaknesses[conceptId] - 1);
      if (rawMemory.weaknesses[conceptId] === 0) delete rawMemory.weaknesses[conceptId];
    }
  } else {
    rawMemory.weaknesses[conceptId] = (rawMemory.weaknesses[conceptId] || 0) + 1;
    rawMemory.lastErrors.push({
      topic: conceptId,
      type: errorType,
      input: payload.userOutput ? payload.userOutput.slice(0, 150) : "Operational Failure",
      time: timestamp
    });
    // Lifecycle de memória: Evita degradação silenciando os logs mais antigos
    if (rawMemory.lastErrors.length > 15) rawMemory.lastErrors.shift();
  }

  rawMemory.history.push({
    timestamp,
    success: payload.success,
    attempts: payload.attempts,
    topic: conceptId,
    difficulty: node.difficulty,
    courseId: normalizedCourseId
  }as any);
  if (rawMemory.history.length > 40) rawMemory.history.shift();

  // 5. Dedução e convergência do Estado Pedagógico Unificado
  const recentHistory = rawMemory.history.slice(-6);
  const failureCount = recentHistory.filter(h => !h.success).length;
  const conceptualFailureCount = rawMemory.lastErrors.slice(-4).filter(e => e.type === "conceptual").length;

  // Cálculo da Taxa de Atrito Dinâmica (Struggle Level)
  currentState.currentConcept = conceptId;
  currentState.mastery = node.mastery;
  currentState.struggleLevel = Math.min(1, (failureCount * 0.15) + (conceptualFailureCount * 0.1));

  // Ajuste de Carga Cognitiva (Saturação) baseado em tempo e erros repetidos
  if (!payload.success) {
    currentState.cognitiveLoad = Math.min(1, currentState.cognitiveLoad + 0.15);
  } else {
    currentState.cognitiveLoad = Math.max(0, currentState.cognitiveLoad - 0.08);
  }

  // Pacing Unificado baseado em performance consistente
  const recentSuccessRate = recentHistory.length > 0 ? recentHistory.filter(h => h.success).length / recentHistory.length : 1;
  if (recentSuccessRate >= 0.85 && currentState.cognitiveLoad < 0.4) {
    currentState.pacing = "accelerated";
  } else if (recentSuccessRate < 0.5 || currentState.struggleLevel > 0.5) {
    currentState.pacing = "slow";
  } else {
    currentState.pacing = "normal";
  }

  // Determinação Automática de Tom Emocional e Verbosidade para a Camada de Prompt
  if (currentState.struggleLevel > 0.6) {
    currentState.emotionalTone = "rehabilitating"; // Fallback pedagógico intencional ocultado sob estratégia ativa
    currentState.verbosity = "concise";          // Respostas curtas evitam sobrecarga cognitiva invisível
  } else if (currentState.pacing === "accelerated") {
    currentState.emotionalTone = "challenging";
    currentState.verbosity = "dense";
  } else if (recentSuccessRate < 0.7) {
    currentState.emotionalTone = "encouraging";
    currentState.verbosity = "standard";
  } else {
    currentState.emotionalTone = "direct";
    currentState.verbosity = "concise";
  }

  // Mapeamento atômico de alvos para revisão estruturada
  currentState.reviewTargets = graph.nodes
    .filter(n => (n.mastery || 0) > 0.2 && (n.mastery || 0) < 0.75 && n.id !== conceptId)
    .map(n => n.id);

  // 6. Sincronização Dinâmica das Métricas Adaptativas Operacionais
const adaptiveData = (await getAdaptiveMetrics(node.difficulty, conceptId)) as any;
  // Amortece e reajusta a dificuldade gerada baseando-se estritamente no estado pedagógico centralizador
  let adjustedDifficulty = adaptiveData.difficulty;
  if (currentState.pacing === "slow") {
    adjustedDifficulty = Math.max(1, adjustedDifficulty - 0.5);
  } else if (currentState.pacing === "accelerated") {
    adjustedDifficulty = Math.min(5, adjustedDifficulty + 0.3);
  }

  // 7. Persistência Consolidada Transacional Sequencial
  await saveKnowledgeGraph(graph);
  await save("memory", rawMemory, "main");
  await save("memory", currentState, stateKey);
  await saveMemorySummary(normalizedCourseId, { lessons: rawMemory.history, memory: rawMemory, mastery: Math.round(node.mastery * 100) });

  return {
    pedagogicalState: currentState,
    difficulty: parseFloat(adjustedDifficulty.toFixed(3)),
    xpAwarded: Math.round(payload.success ? 20 * adaptiveData.xpMultiplier : 5),
    coinsAwarded: payload.success ? adaptiveData.coinsAwarded : 2,
    updatedNode: node
  }
}
