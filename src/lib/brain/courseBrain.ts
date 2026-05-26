"use client";

import {
  getSuggestedTopics,
  getWeakTopics,
  summarizeCurriculum,
} from "../others/curriculumState";

export type CourseBrainState =
  | "CONTINUE_LESSONS"
  | "REVIEW_MODE"
  | "DIFFICULTY_SHIFT"
  | "COURSE_COMPLETE"
  | "REGENERATE_COURSE";

export interface CourseBrainDecision {
  state: CourseBrainState;
  reason: string;
  confidence: number;
  nextTopic?: string;
  weakTopics?: string[];
  summary?: string;
  healthScore?: number;
}

/**
 * 🧠 COURSE BRAIN IDENTIFICATION MODULE
 * Decide o estado global do curso baseado em progresso real do usuário.
 */
export async function identifyCourseBrain(params: {
  courseId: string;
  globalMastery?: number;
  globalConfidence?: number;
  streak?: number;
}): Promise<CourseBrainDecision> {
  const {
    courseId,
    globalMastery = 0,
    globalConfidence = 0,
    streak = 0,
  } = params;

  // =========================
  // 📊 CURRICULUM STATE
  // =========================
  const weakTopics = await getWeakTopics(courseId);
  const suggestedTopics = await getSuggestedTopics(courseId);
  const curriculumSummary = await summarizeCurriculum(courseId);

  // média de fraqueza
  const avgWeakness = weakTopics.length
    ? weakTopics.reduce((acc, t) => acc + t.mastery, 0) / weakTopics.length
    : 100;

  // média de progresso sugerido
  const avgSuggested = suggestedTopics.length
    ? suggestedTopics.reduce((acc, t) => acc + t.mastery, 0) /
      suggestedTopics.length
    : 100;

  // =========================
  // 🧠 HEALTH SCORE GLOBAL
  // =========================
  const healthScore =
    globalMastery * 0.45 +
    globalConfidence * 0.3 +
    avgSuggested * 0.15 +
    streak * 2;

  // =========================
  // 🧭 DECISION ENGINE
  // =========================

  /**
   * 🏁 COURSE COMPLETE
   * Usuário dominou o conteúdo de forma estável
   */
  if (
    globalMastery >= 85 &&
    globalConfidence >= 80 &&
    weakTopics.length === 0 &&
    healthScore > 80
  ) {
    return {
      state: "COURSE_COMPLETE",
      reason:
        "High mastery + stable confidence + no weak topics + strong health score",
      confidence: 0.93,
      summary: curriculumSummary,
      healthScore,
    };
  }

  /**
   * 🔁 REVIEW MODE
   * Detecta fragilidade ou conhecimento inconsistente
   */
  if (weakTopics.length >= 3 || avgWeakness < 45) {
    return {
      state: "REVIEW_MODE",
      reason:
        "Multiple weak topics detected or low mastery stability across nodes",
      confidence: 0.87,
      weakTopics: weakTopics.map((t) => t.topic),
      summary: curriculumSummary,
      healthScore,
    };
  }

  /**
   * ⚖️ DIFFICULTY SHIFT
   * Usuário evoluindo rápido demais ou sem profundidade suficiente
   */
  if (healthScore > 75 && globalMastery < 70) {
    return {
      state: "DIFFICULTY_SHIFT",
      reason:
        "Progression too fast or shallow learning detected, adjusting curve",
      confidence: 0.8,
      nextTopic: suggestedTopics[0]?.topic,
      healthScore,
    };
  }

  /**
   * ▶️ CONTINUE NORMAL FLOW
   * Fluxo padrão de aprendizado
   */
  if (suggestedTopics.length > 0) {
    return {
      state: "CONTINUE_LESSONS",
      reason: "Stable learning progression detected",
      confidence: 0.82,
      nextTopic: suggestedTopics[0]?.topic,
      healthScore,
    };
  }

  /**
   * 🧨 FALLBACK → REGENERATE COURSE
   * Sem caminho pedagógico claro no grafo
   */
  return {
    state: "REGENERATE_COURSE",
    reason:
      "No valid progression path found in curriculum graph, resetting structure",
    confidence: 0.72,
    summary: curriculumSummary,
    healthScore,
  };
}

/**
 * 🧩 Helper opcional: leitura rápida do estado do curso
 */
export function isCourseComplete(decision: CourseBrainDecision): boolean {
  return decision.state === "COURSE_COMPLETE";
}

/**
 * 🧠 Helper opcional: modo de revisão ativo
 */
export function isInReviewMode(decision: CourseBrainDecision): boolean {
  return decision.state === "REVIEW_MODE";
}
