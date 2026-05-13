"use client";

import { evaluateLogic } from "./evaluator.logic";
import { updateMastery } from "./mastery";
import { updateConceptMastery } from "./knowledgeGraph";
import { getAdaptiveMetrics } from "./adaptive";
import { addXP, addCoins } from "./economy";
import { save } from "./db";
import { playSound } from "./sounds";
import { explainError } from "./explanationAI";

/* =========================================================
   TYPES
========================================================= */
interface EvaluateExerciseParams {
  exercise: any;
  userAnswer: string;
  course?: any;
  lesson?: any;
  conceptId?: string;
}

interface EvaluationResult {
  correct: boolean;
  expected: string;
  userAnswer: string;
  xp: number;
  coins: number;
  masteryDelta: number;
  feedback: string;
  conceptId: string;
  difficulty: number;
}

/* =========================================================
   REWARDS CALCULATOR
========================================================= */
function computeRewards({
  difficulty,
  correct,
  adaptiveMultiplier,
}: {
  difficulty: number;
  correct: boolean;
  adaptiveMultiplier: number;
}) {
  if (!correct) return { xp: 4, coins: 1 };

  const baseXP = 15 + difficulty * 8;
  const baseCoins = 5 + difficulty * 3;

  return {
    xp: Math.floor(baseXP * adaptiveMultiplier),
    coins: Math.floor(baseCoins * adaptiveMultiplier),
  };
}

/* =========================================================
   MAIN EVALUATION FLOW
========================================================= */
export async function evaluateExercise({
  exercise,
  userAnswer,
  course,
  lesson,
  conceptId,
}: EvaluateExerciseParams): Promise<EvaluationResult> {
  const expected = exercise?.answer || "";
  let iaFeedback = "";

  // 1. TENTA A VALIDAÇÃO HARDCORE (Rápida/Local/Heurística)
  // Esta função usa tokenização e normalização para ser flexível
  // 1. TENTA A VALIDAÇÃO HARDCORE
  // Ordem correta: (recebido, esperado)
  let correct = await evaluateLogic(userAnswer, expected);

  // 2. FALLBACK DE IA: Se o hardcore falhar
  if (!correct && userAnswer.length > 2) {
    try {
      // CORREÇÃO: Passando como objeto único para resolver o erro "Expected 1 arguments, but got 3"
      const aiAnalysis = await explainError({ 
        question: exercise.question, 
        expected: expected, 
        received: userAnswer 
      });
      
      if (aiAnalysis.isCorrectVariation) {
        correct = true;
        iaFeedback = "Neural link established: Intent validated by AI.";
      } else {
        iaFeedback = aiAnalysis.explanation;
      }
    } catch (e) {
      console.error("AI Fallback failed", e);
    }
  }

  // Métricas Adaptativas e Dificuldade
  const metrics = await getAdaptiveMetrics();
  const difficulty = exercise?.difficulty || lesson?.difficulty || 1;
  const resolvedConceptId = conceptId || lesson?.conceptId || "core_fundamentals";

  const rewards = computeRewards({
    difficulty,
    correct,
    adaptiveMultiplier: metrics?.xpMultiplier || 1,
  });

  /* =====================================================
     ECONOMY & FEEDBACK (Main Thread)
  ===================================================== */
  if (correct) {
    await addXP(rewards.xp);
    await addCoins(rewards.coins);
    playSound("success", 0.4);
  } else {
    playSound("error", 0.35);
  }

  /* =====================================================
     MASTERY & KNOWLEDGE GRAPH
  ===================================================== */
  const masteryResult = await updateMastery({
    conceptId: resolvedConceptId,
    success: correct,
    weight: Math.max(1, difficulty * 0.6),
  });

  if (course?.id) {
    await updateConceptMastery(course.id, resolvedConceptId, correct);
  }

  /* =====================================================
     PERSISTENCE (Error Memory)
  ===================================================== */
  // Só salvamos no log de erros se a IA também concordar que está errado
  if (!correct) {
    await save("errors", {
      question: exercise?.question,
      correct: expected,
      userAnswer,
      conceptId: resolvedConceptId,
      courseId: course?.id || "unknown",
      difficulty,
      timestamp: Date.now(),
    }, crypto.randomUUID());
  }

  return {
    correct,
    expected,
    userAnswer,
    xp: rewards.xp,
    coins: rewards.coins,
    masteryDelta: masteryResult.mastery,
    conceptId: resolvedConceptId,
    difficulty,
    feedback: correct
      ? (iaFeedback || "Concept assimilated successfully.")
      : (iaFeedback || "Neural mismatch detected. Reinforcement recommended."),
  };
}