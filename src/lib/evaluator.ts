"use client";

import { evaluateLogic } from "./evaluator.logic";
import { updateMastery } from "./mastery";
import { updateConceptMastery } from "./knowledgeGraph";
import { getAdaptiveMetrics } from "./adaptive";
import { addXP, addCoins } from "./economy";
import { getUser, save } from "./db";
import { playSound } from "./sounds";
import { explainError } from "./explanationAI";
import { computeLessonXp, calculateLevel } from "./level";

interface EvaluateExerciseParams {
  exercise: any;
  userAnswer: string;
  course?: any;
  lesson?: any;
  conceptId?: string;
}

function computeRewards({
  difficulty,
  correct,
  adaptiveMultiplier,
  currentXp,
  streakDays = 1
}: {
  difficulty: number;
  correct: boolean;
  adaptiveMultiplier: number;
  currentXp: number;
  streakDays?: number;
}) {
  if (!correct) return { xp: 5, coins: 1 };
  const playerLevel = calculateLevel(currentXp);
  const lessonXp = computeLessonXp(playerLevel, difficulty, streakDays, 1);
  const baseCoins = 5 + (difficulty * 10);

  return {
    xp: Math.floor(lessonXp * adaptiveMultiplier),
    coins: Math.floor(baseCoins * adaptiveMultiplier),
  };
}

export async function evaluateExercise({
  exercise,
  userAnswer,
  course,
  lesson,
  conceptId,
}: EvaluateExerciseParams) {
  const expected = exercise?.answer || "";
  let iaFeedback = "";

  // 1. VALIDAÇÃO LÓGICA
  let correct = await evaluateLogic(userAnswer, expected);

  // 2. FALLBACK DE IA (Trava reduzida para 1 caractere para aceitar keywords curtas)

  // FALLBACK OTIMIZADO: Validação Heurística para respostas curtas (Keywords)
  if (!correct && userAnswer.trim().length <= 5) {
    const normalizedInput = userAnswer.trim().toLowerCase();
    const normalizedExpected = expected.trim().toLowerCase();
    if (normalizedInput === normalizedExpected) correct = true;
  }
  if (!correct && userAnswer.trim().length > 0) {
    try {
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

  // 3. RECUPERAÇÃO DE ESTADO
  const user = await getUser();
  const currentXp = user?.xp || 0;
  const streakDays = user?.streak || 1;
  const metrics = await getAdaptiveMetrics();
  const difficulty = exercise?.difficulty || lesson?.difficulty || 1;
  const resolvedConceptId = conceptId || lesson?.conceptId || "core_fundamentals";

  // 4. RECOMPENSAS
  const rewards = computeRewards({
    difficulty,
    correct,
    adaptiveMultiplier: metrics?.xpMultiplier || 1,
    currentXp,
    streakDays,
  });

  // 5. PERSISTÊNCIA E ECONOMIA
  if (correct) {
    await addXP(rewards.xp);
    await addCoins(rewards.coins);
    playSound("success", 0.4);
  } else {
    playSound("error", 0.35);
    await save("errors", {
      question: exercise?.question,
      correct: expected,
      userAnswer,
      conceptId: resolvedConceptId,
      courseId: course?.id || "unknown",
      timestamp: Date.now(),
    }, crypto.randomUUID());
  }

  const masteryResult = await updateMastery({
    conceptId: resolvedConceptId,
    success: correct,
    weight: Math.max(1, difficulty * 0.6),
  });

  if (course?.id) {
    await updateConceptMastery(course.id, resolvedConceptId, correct);
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
      ? (iaFeedback || "Concept assimilated.")
      : (iaFeedback || "Neural mismatch detected."),
  };
}