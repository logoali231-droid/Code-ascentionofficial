"use client";
import { compareAnswers } from "./evaluator.logic";
import { updateMastery } from "./mastery";
import { updateConceptMastery } from "./knowledgeGraph";
import { getAdaptiveMetrics } from "./adaptive";
import { addXP, addCoins } from "./economy";
import { save } from "./db";
import { playSound } from "./sounds";

/* =========================================================
   TYPES (Mantidos)
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
   HELPERS (Removidos normalize e compareAnswers daqui, 
   pois agora vêm do evaluator.logic.ts)
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
   MAIN
========================================================= */

export async function evaluateExercise({
  exercise,
  userAnswer,
  course,
  lesson,
  conceptId,
}: EvaluateExerciseParams): Promise<EvaluationResult> {
  const expected = exercise?.answer || "";

  // 2. USANDO A LÓGICA COMPARTILHADA
  const correct = compareAnswers(expected, userAnswer);

  const metrics = await getAdaptiveMetrics();

  const difficulty =
    exercise?.difficulty ||
    lesson?.difficulty ||
    course?.difficulty ||
    metrics?.difficulty ||
    1;

  const resolvedConceptId =
    conceptId ||
    lesson?.conceptId ||
    exercise?.conceptId ||
    "core_fundamentals";

  /* =====================================================
     REWARDS
  ===================================================== */
  const rewards = computeRewards({
    difficulty,
    correct,
    adaptiveMultiplier: metrics?.xpMultiplier || 1,
  });

  /* =====================================================
     ECONOMY (Isso só roda aqui na Main Thread)
  ===================================================== */
  if (correct) {
    await addXP(rewards.xp);
    await addCoins(rewards.coins);
    playSound("success", 0.4); // Funciona aqui!
  } else {
    playSound("error", 0.35); // Funciona aqui!
  }

  /* =====================================================
     MASTERY SYSTEM
  ===================================================== */
  const masteryResult = await updateMastery({
    conceptId: resolvedConceptId,
    success: correct,
    weight: Math.max(1, difficulty * 0.6),
  });

  /* =====================================================
     KNOWLEDGE GRAPH
  ===================================================== */
  if (course?.id) {
    await updateConceptMastery(course.id, resolvedConceptId, correct);
  }

  /* =====================================================
     ERROR MEMORY
  ===================================================== */
  if (!correct) {
    await save(
      "errors",
      {
        question: exercise?.question,
        correct: expected,
        userAnswer,
        conceptId: resolvedConceptId,
        courseId: course?.id || "unknown",
        difficulty,
        timestamp: Date.now(),
      },
      crypto.randomUUID()
    );
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
      ? "Concept assimilated successfully."
      : "Neural mismatch detected. Reinforcement recommended.",
  };
}
