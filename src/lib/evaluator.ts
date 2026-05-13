"use client";

import { evaluateLogic } from "./evaluator.logic";
import { updateMastery } from "./mastery";
import { updateConceptMastery } from "./knowledgeGraph";
import { getAdaptiveMetrics } from "./adaptive";
import { addXP, addCoins } from "./economy";
import { db, getUser, save } from "./db"; // Importação do getUser e db adicionada
import { playSound } from "./sounds";
import { explainError } from "./explanationAI";
import { computeLessonXp, calculateLevel } from "./level";

/* =========================================================
   TYPES (Mantidos conforme seu código)
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
  // Utiliza a nova fórmula do level.ts (Curva de Raiz Quadrada)
  const lessonXp = computeLessonXp(playerLevel, difficulty, streakDays, 1);
  
  const baseCoins = 5 + (difficulty * 10);

  return {
    xp: Math.floor(lessonXp * adaptiveMultiplier),
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

  // 1. TENTA A VALIDAÇÃO HARDCORE
  let correct = await evaluateLogic(userAnswer, expected);

  // 2. FALLBACK DE IA: Se o hardcore falhar
  if (!correct && userAnswer.length > 2) {
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

  // 3. COLETA DE DADOS DO USUÁRIO (NOVA PARTE)
  // Precisamos do XP e Streak reais para o computeRewards
  const user = await getUser();
  const currentXp = user?.xp || 0;
  const streakDays = user?.streak || 1;

  // 4. MÉTRICAS ADAPTATIVAS
  const metrics = await getAdaptiveMetrics();
  const difficulty = exercise?.difficulty || lesson?.difficulty || 1;
  const resolvedConceptId = conceptId || lesson?.conceptId || "core_fundamentals";

  // 5. CÁLCULO DE RECOMPENSAS (CORRIGIDO)
  const rewards = computeRewards({
    difficulty,
    correct,
    adaptiveMultiplier: metrics?.xpMultiplier || 1,
    currentXp, // Passando o XP obrigatório
    streakDays, // Passando a sequência atual
  });

  /* =====================================================
     ECONOMY & FEEDBACK
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
     PERSISTENCE
  ===================================================== */
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