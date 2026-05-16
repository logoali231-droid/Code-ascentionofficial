"use client";

import React, { useState, useEffect } from 'react'; // Adicionado useEffect explicitamente
import { computeLessonXp, calculateLevel } from '@/lib/level';
import { getUser } from '@/lib/db';
import CodeEditor from './CodeEditor';
import { GibberishDetector } from "@/lib/anti-spam/gibberish-detector";
import { getAdaptiveMetrics } from '@/lib/adaptive'; // <-- IMPORT FIXADO AQUI

const detector = new GibberishDetector();

interface Exercise {
  id: string;
  type: 'code' | 'quiz' | 'dragdrop' | 'mcq';
  language: string;
  question: string;
  answer: string;
  codeSnippet?: string;
  starterCode?: string;
  explanation?: string;
  options?: string[];
}

interface ExerciseRendererProps {
  rawExercise: any;
  loading?: boolean;
  onComplete?: (success: boolean) => void;
  onNext?: (success: boolean, value: string, xpGain?: number) => Promise<void>;
  course?: { topic: string; id: string };
  rarity?: string;
  isStreaming?: boolean;
  streamProgress?: number;
  streamIndex?: number;
  streamTotal?: number;
  adaptiveMetrics?: any; 
}

export default function ExerciseRenderer({
  rawExercise,
  loading = false,
  onComplete,
  onNext,
  course,
  rarity = 'COMMON',
  isStreaming = false,
  streamProgress = 0,
  streamIndex = 0,
  streamTotal = 0
}: ExerciseRendererProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [computedMetrics, setComputedMetrics] = useState<any>(null);
  const [mutatedType, setMutatedType] = useState<'code' | 'quiz' | 'dragdrop' | 'mcq'>('code');

  // Ajustado o ciclo de vida para garantir o sincronismo sem travar o escopo do componente
  useEffect(() => {
    async function fetchTopology() {
      if (!rawExercise) return;
      
      try {
        const baseDiff = rawExercise.difficulty || 2; 
        const metrics = await getAdaptiveMetrics(baseDiff, course?.topic);
        setComputedMetrics(metrics);

        const currentDifficulty = metrics.difficulty;

        if (currentDifficulty < 2.2) {
          setMutatedType(rawExercise.type === 'code' ? 'dragdrop' : rawExercise.type || 'mcq');
        } else if (currentDifficulty > 4.2) {
          setMutatedType('code');
        } else {
          setMutatedType(rawExercise.type || 'code');
        }
      } catch (err) {
        console.error("Erro ao carregar topologia adaptativa:", err);
        setMutatedType(rawExercise.type || 'code');
      }
    }
    
    fetchTopology();
  }, [rawExercise, course?.topic]);

  // Montagem segura do esqueleto do exercício com fallback de opções se necessário
  const exercise: Exercise = {
    id: rawExercise?.id || '',
    language: rawExercise?.language || 'javascript',
    question: rawExercise?.question || '',
    answer: rawExercise?.answer || '',
    options: rawExercise?.options || [],
    ...rawExercise,
    type: mutatedType // O tipo mutado entra por último para sobrescrever o rawExercise de forma segura
  } as Exercise;

  if ((exercise.type === 'dragdrop' || exercise.type === 'mcq') && (!exercise.options || exercise.options.length === 0)) {
    exercise.options = Array.from(new Set([
      ...exercise.answer.split(/[\s{}();]+/).filter(x => x.length > 1),
      "undefined",
      "null",
      "return"
    ])).slice(0, 6);
  }

  const handleValidation = async (value: string) => {
    setErrorMessage(null);
    if (!value) return;

    if (exercise.type === 'code' && detector.isTotalGibberish(value, 'lesson')) {
      setErrorMessage("RUÍDO NEURAL DETECTADO: Input inválido para processamento.");
      onComplete?.(false);
      return; 
    }

    const isCorrect = value.trim() === exercise.answer.trim();

    if (isCorrect) {
      const xpMultiplier = computedMetrics?.xpMultiplier || 1.2;
      const user = await getUser();
      const currentXp = user?.xp || 0;
      const currentLevel = calculateLevel(currentXp);
      const streak = user?.streak || 1;

      const dynamicXp = Math.round(computeLessonXp(
        currentLevel,
        (computedMetrics?.difficulty || 2) * 0.1,
        streak,
        1
      ) * xpMultiplier);

      onComplete?.(true);
      if (onNext) {
        await onNext(true, value, dynamicXp);
      }
    } else {
      onComplete?.(false);
      if (exercise.type === 'code') {
        setErrorMessage("SINTAXE INCORRETA: Verifique os parâmetros do núcleo.");
      } else {
        setErrorMessage("COMBINAÇÃO DE LÓGICA INCORRETA. Tente reordenar os blocos.");
      }
    }
  };

  // --- GARANTIA DO SKELETON DE LOADING ---
  if (loading || !exercise.id) {
    return (
      <div className="p-6 border border-slate-800 bg-slate-950/50 animate-pulse rounded-xl font-mono text-cyan-500">
        INITIALIZING_NEURAL_LINK...
      </div>
    );
  }

  // O bloco de return principal abaixo agora é alcançado perfeitamente pelo parser!
  return (
    <div className="flex flex-col gap-4 p-4 border border-slate-800 bg-black/40 rounded-xl font-mono">
      {/* Resto do seu JSX contendo o layout das questões, botões e editores */}
    </div>);
}