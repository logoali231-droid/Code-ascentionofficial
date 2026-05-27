"use client";

import { evaluate } from "./computeExecutor";
import { updateMastery } from "./curriculumState";
import { getAdaptiveMetrics } from "./adaptive";
import { addXP, addCoins } from "./economy";
import { getUser, save } from "./db";
import { playSound } from "./sounds";
import { explainError } from "./explanationAI";
import { computeLessonXp, calculateLevel } from "./level";
import { eventBus, EventType } from "./eventBus";

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
  streakDays = 1,
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
  const baseCoins = 5 + difficulty * 10;

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

  const traceId = eventBus.generateTraceId();
  const sourceComponent = "evaluator.ts";

  eventBus.emit({
    type: EventType.EXERCISE_SUBMITTED,
    source: sourceComponent,
    traceId,
    payload: {
      exerciseId: exercise?.id,
      question: exercise?.question,
      language: course?.language || "unknown",
    },
  });

  let correct = false;
  try {
    correct = await evaluate(userAnswer, expected);
  } catch (e) {
    console.error("Worker Evaluation Failed, falling back to basic check", e);
    // Fallback opcional se o worker falhar
    correct = userAnswer.trim().toLowerCase() === expected.trim().toLowerCase();
  }
  const userStats = await getUser();
  const userFactionId = userStats?.factionId || "";
  const userXp = userStats?.xp || 0;

  const { FactionManager } = await import("../ranking/factions");
  const currentActiveBonuses = FactionManager.getActiveBonuses(
    userFactionId,
    userXp,
  );

  const evaluationBonus =
    currentActiveBonuses.find(
      (b) => (b.type as string) === "EVALUATION_ACCURACY_BOOST",
    )?.value || 0;
  const diminishedBonus = evaluationBonus / (1 + evaluationBonus);
  const targetThreshold = Math.max(0.62, 0.72 - diminishedBonus);

  if (!correct && userAnswer.trim().length > 0) {
    const cleanExpected = expected.toLowerCase().trim();
    const cleanReceived = userAnswer.toLowerCase().trim();

    const expectedTokens = cleanExpected.split(/[^a-z0-9_]+/gi).filter(Boolean);
    const receivedTokens = cleanReceived.split(/[^a-z0-9_]+/gi).filter(Boolean);

    if (expectedTokens.length > 0) {
      const overlap = expectedTokens.filter((t: string) =>
        receivedTokens.includes(t),
      ).length;
      const currentRatio = overlap / expectedTokens.length;

      if (currentRatio >= targetThreshold) {
        correct = true;
        iaFeedback = `Neural alignment enhanced by Skill Tree bônus. Adjusted Threshold: ${targetThreshold.toFixed(2)}`;
      }
    }
  }

  if (!correct && userAnswer.trim().length <= 5) {
    const normalizedInput = userAnswer.trim().toLowerCase();
    const normalizedExpected = expected.trim().toLowerCase();
    if (normalizedInput === normalizedExpected) correct = true;
  }

  if (!correct && userAnswer.trim().length > 0) {
    try {
      eventBus.emit({
        type: EventType.AI_ANALYSIS_START,
        source: sourceComponent,
        traceId,
        payload: {
          question: exercise?.question,
          inputLength: userAnswer.length,
        },
      });

      const aiAnalysis = await explainError({
        question: exercise.question,
        expected: expected,
        received: userAnswer,
      });

      eventBus.emit({
        type: EventType.AI_ANALYSIS_READY,
        source: sourceComponent,
        traceId,
        payload: { isCorrectVariation: aiAnalysis.isCorrectVariation },
      });

      if (aiAnalysis.isCorrectVariation) {
        correct = true;
        iaFeedback = "Neural link established: Intent validated by AI.";
      } else {
        iaFeedback = aiAnalysis.explanation;
      }
    } catch (e) {
      console.error("AI Fallback failed", e);

      eventBus.emit({
        type: EventType.AI_ERROR,
        source: sourceComponent,
        traceId,
        payload: { error: e instanceof Error ? e.message : String(e) },
      });
    }
  }

  const user = await getUser();
  const currentXp = user?.xp || 0;
  const streakDays = user?.streak || 1;
  const difficulty = exercise?.difficulty || lesson?.difficulty || 1;
  const resolvedConceptId =
    conceptId || lesson?.conceptId || "core_fundamentals";
  const metrics = await getAdaptiveMetrics(difficulty, resolvedConceptId);

  const rewards = computeRewards({
    difficulty,
    correct,
    adaptiveMultiplier: metrics?.xpMultiplier || 1,
    currentXp,
    streakDays,
  });

  if (correct) {
    await addXP(rewards.xp);
    await addCoins(rewards.coins);
    playSound("success", 0.4);

    eventBus.emit({
      type: EventType.EXERCISE_PASSED,
      source: sourceComponent,
      traceId,
      payload: {
        xpEarned: rewards.xp,
        coinsEarned: rewards.coins,
        conceptId: resolvedConceptId,
      },
    });
  } else {
    playSound("error", 0.35);
    await save(
      "errors",
      {
        question: exercise?.question,
        correct: expected,
        userAnswer,
        conceptId: resolvedConceptId,
        courseId: course?.id || "unknown",
        timestamp: Date.now(),
      },
      crypto.randomUUID(),
    );

    eventBus.emit({
      type: EventType.EXERCISE_FAILED,
      source: sourceComponent,
      traceId,
      payload: { conceptId: resolvedConceptId, difficulty },
    });
  }

  let currentTopicMastery = 0;
  if (course?.id && exercise?.topic) {
    const delta = correct ? Math.max(5, Math.floor(difficulty * 4)) : -5;
    currentTopicMastery = await updateMastery(course.id, exercise.topic, delta);
  }

  return {
    correct,
    expected,
    userAnswer,
    xp: rewards.xp,
    coins: rewards.coins,
    masteryDelta: currentTopicMastery,
    conceptId: resolvedConceptId,
    difficulty,
    traceId,
    feedback: correct
      ? iaFeedback || "Concept assimilated."
      : iaFeedback || "Neural mismatch detected.",
  };
}
