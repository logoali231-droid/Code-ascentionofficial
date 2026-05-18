"use client";

import { evaluateLogic } from "./evaluator.logic";
import { updateMastery } from "./curriculumState";
import { updateConceptMastery } from "./knowledgeGraph";
import { getAdaptiveMetrics } from "./adaptive";
import { addXP, addCoins } from "./economy";
import { getUser, save } from "./db";
import { playSound } from "./sounds";
import { explainError } from "./explanationAI";
import { computeLessonXp, calculateLevel } from "./level";

// INCLUSÃO: Importação do barramento central e dos tipos de eventos
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

  // 0. INICIALIZAÇÃO DE RASTREABILIDADE
  // Geramos o traceId na entrada para envelopar toda a jornada desta submissão
  const traceId = eventBus.generateTraceId();
  const sourceComponent = "evaluator.ts";

  eventBus.emit({
    type: EventType.EXERCISE_SUBMITTED,
    source: sourceComponent,
    traceId,
    payload: {
      exerciseId: exercise?.id,
      question: exercise?.question,
      language: course?.language || "unknown"
    }
  });

  // 1. VALIDAÇÃO LÓGICA
  let correct = await evaluateLogic(userAnswer, expected);

  // 2. FALLBACK DE IA COM TRAVA ALGORÍTMICA (Skill Caps & Hard Floors)
  // Recupera o usuário e calcula bônus modificadores antes do motor aceitar variações
  const userStats = await getUser();
  
  // Resgata bônus de precisão da árvore de habilidades/facções (Ex: +0.15 de bônus passivo)
  const userFactionId = userStats?.factionId || "";
  const userXp = userStats?.xp || 0;
  
  // Importação sob demanda do gerenciador para calcular o recuo adaptativo do threshold
  const { FactionManager } = await import("./ranking/factions");
  const currentActiveBonuses = FactionManager.getActiveBonuses(userFactionId, userXp);
  
  // CORREÇÃO TS2367: Casting "as string" adicionado para permitir a checagem no enum/tipo dinâmico
  const evaluationBonus = currentActiveBonuses.find(b => (b.type as string) === 'EVALUATION_ACCURACY_BOOST')?.value || 0;

  // Aplicação da Curva de Retornos Decrescentes (Diminishing Returns) para o bônus passivo
  // Impede que o bônus escale linearmente até quebrar o desafio. Fórmula: bônus_real = bônus / (1 + bônus)
  const diminishedBonus = evaluationBonus / (1 + evaluationBonus);

  // O threshold padrão do sistema é 0.72 (definido no compareCode do evaluator.logic)
  // O bônus passivo reduz a exigência de acerto, mas NUNCA pode baixar o threshold além do Hard Floor de 0.62
  const targetThreshold = Math.max(0.62, 0.72 - diminishedBonus);

  // Se o código atingiu a nota matemática modificada, passa a ser considerado correto pelo motor
  if (!correct && userAnswer.trim().length > 0) {
    const cleanExpected = expected.toLowerCase().trim(); // Equivalente rápido à normalização local
    const cleanReceived = userAnswer.toLowerCase().trim();
    
    // Executa a tokenização rápida para validar a nota atual do usuário contra o threshold dinâmico
    const expectedTokens = cleanExpected.split(/[^a-z0-9_]+/gi).filter(Boolean);
    const receivedTokens = cleanReceived.split(/[^a-z0-9_]+/gi).filter(Boolean);
    
    if (expectedTokens.length > 0) {
      // CORREÇÃO TS7006: Tipagem explícita (t: string) adicionada no escopo do filter
      const overlap = expectedTokens.filter((t: string) => receivedTokens.includes(t)).length;
      const currentRatio = overlap / expectedTokens.length;
      
      // Se o score do usuário passar da barreira flexibilizada pelo bônus (respeitando o floor de 0.62)
      if (currentRatio >= targetThreshold) {
        correct = true;
        iaFeedback = `Neural alignment enhanced by Skill Tree bônus. Adjusted Threshold: ${targetThreshold.toFixed(2)}`;
      }
    }
  }

  // FALLBACK OTIMIZADO: Validação Heurística para respostas curtas (Keywords)
  if (!correct && userAnswer.trim().length <= 5) {
    const normalizedInput = userAnswer.trim().toLowerCase();
    const normalizedExpected = expected.trim().toLowerCase();
    if (normalizedInput === normalizedExpected) correct = true;
  }
  
  if (!correct && userAnswer.trim().length > 0) {
    try {
      // TELEMETRIA: Notifica que o Kernel local de IA foi acionado para o fallback
      eventBus.emit({
        type: EventType.AI_ANALYSIS_START,
        source: sourceComponent,
        traceId,
        payload: { question: exercise?.question, inputLength: userAnswer.length }
      });

      const aiAnalysis = await explainError({
        question: exercise.question,
        expected: expected,
        received: userAnswer
      });

      // TELEMETRIA: Resposta da IA capturada com sucesso
      eventBus.emit({
        type: EventType.AI_ANALYSIS_READY,
        source: sourceComponent,
        traceId,
        payload: { isCorrectVariation: aiAnalysis.isCorrectVariation }
      });

      if (aiAnalysis.isCorrectVariation) {
        correct = true;
        iaFeedback = "Neural link established: Intent validated by AI.";
      } else {
        iaFeedback = aiAnalysis.explanation;
      }
    } catch (e) {
      console.error("AI Fallback failed", e);
      
      // TELEMETRIA: Registra falha crítica na execução do modelo local
      eventBus.emit({
        type: EventType.AI_ERROR,
        source: sourceComponent,
        traceId,
        payload: { error: e instanceof Error ? e.message : String(e) }
      });
    }
  }

  // 3. RECUPERAÇÃO DE ESTADO
 // 3. RECUPERAÇÃO DE ESTADO
  const user = await getUser();
  const currentXp = user?.xp || 0;
  const streakDays = user?.streak || 1;
  const difficulty = exercise?.difficulty || lesson?.difficulty || 1;
  const resolvedConceptId = conceptId || lesson?.conceptId || "core_fundamentals";
  const metrics = await getAdaptiveMetrics(difficulty, resolvedConceptId);

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

    // TELEMETRIA: Dispara evento central de sucesso no exercício
    eventBus.emit({
      type: EventType.EXERCISE_PASSED,
      source: sourceComponent,
      traceId,
      payload: { xpEarned: rewards.xp, coinsEarned: rewards.coins, conceptId: resolvedConceptId }
    });

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

    // TELEMETRIA: Dispara evento central de falha no exercício
    eventBus.emit({
      type: EventType.EXERCISE_FAILED,
      source: sourceComponent,
      traceId,
      payload: { conceptId: resolvedConceptId, difficulty }
    });
  }

  // ALTERADO: Sincroniza dinamicamente com o grafo curricular do usuário usando delta adaptativo
  let currentTopicMastery = 0;
  if (course?.id && exercise?.topic) {
    const delta = correct ? Math.max(5, Math.floor(difficulty * 4)) : -5;
    currentTopicMastery = await updateMastery(course.id, exercise.topic, delta);
  }

  if (course?.id) {
    await updateConceptMastery(course.id, resolvedConceptId, correct);
  }

  // Retornamos o traceId no payload de saída para caso a UI queira linkar logs visuais
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
      ? (iaFeedback || "Concept assimilated.")
      : (iaFeedback || "Neural mismatch detected."),
  };
}
