"use client";

import React, { useState } from 'react';
import { computeLessonXp, calculateLevel } from '@/lib/level';
import { getUser } from '@/lib/db';
import CodeEditor from './CodeEditor';
import { GibberishDetector } from "@/lib/anti-spam/gibberish-detector";

// Inicialização do detector fora do componente para evitar re-instanciação
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
  onNext?: (success: boolean, value: string) => Promise<void>;
  course?: { topic: string };
  rarity?: string;
  isStreaming?: boolean;
  streamProgress?: number;
  streamIndex?: number;
  streamTotal?: number;
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

  const exercise: Exercise = {
    id: rawExercise?.id || '',
    type: (rawExercise?.type as any) || 'code',
    language: rawExercise?.language || 'javascript',
    question: rawExercise?.question || '',
    answer: rawExercise?.answer || '',
    options: rawExercise?.options || [],
    ...rawExercise
  } as Exercise;

  const handleValidation = async (value: string) => {
    setErrorMessage(null);
    if (!value) return;

    // --- INTEGRAÇÃO ANTI-SPAM (GIBBERISH DETECTOR) ---
    // Adicionado o segundo argumento 'lesson' exigido pelo TypeScript
    if (exercise.type === 'code' && detector.isTotalGibberish(value, 'lesson')) {
      setErrorMessage("RUÍDO NEURAL DETECTADO: Input inválido para processamento.");
      onComplete?.(false);
      return; // Bloqueia o processamento de XP e avanço
    }

    const isCorrect = value.trim() === exercise.answer.trim();

    if (isCorrect) {
      const user = await getUser();
      const currentXp = user?.xp || 0;
      const currentLevel = calculateLevel(currentXp);
      const streak = user?.streak || 1;

      const difficultyMap: Record<string, number> = { 'COMMON': 0.2, 'RARE': 0.5, 'EPIC': 1.0 };
      const diff = difficultyMap[rarity] || 0.4;

      const dynamicXp = computeLessonXp(
        currentLevel,
        diff,
        streak,
        1
      );

      onComplete?.(true);
      if (onNext) {
        await onNext(true, value);
      }
    } else {
      onComplete?.(false);
      if (exercise.type === 'code') {
        setErrorMessage("SINTAXE INCORRETA: Verifique os parâmetros do núcleo.");
      }
    }
  }

  if (loading || !exercise.id) {
    return (
      <div className="p-6 border border-slate-800 bg-slate-950/50 animate-pulse rounded-xl font-mono text-cyan-500">
        INITIALIZING_NEURAL_LINK...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 border border-slate-800 bg-black/40 rounded-xl font-mono">
      <div className="flex justify-between items-center border-b border-slate-800 pb-2 text-[10px]">
        <span className="text-slate-500 uppercase">
          {course?.topic ? `${course.topic}_${rarity}` : `${rarity}_NODE`}
        </span>

        <div className="flex gap-3">
          {isStreaming && (
            <span className="text-cyan-500 animate-pulse">SYNCING_{streamProgress}%</span>
          )}
          {streamTotal > 0 && (
            <span className="text-slate-600 font-bold">{streamIndex}/{streamTotal}</span>
          )}
        </div>
      </div>

      <div className="text-lg text-slate-100 py-2">{exercise.question}</div>

      <div className="min-h-50 flex flex-col justify-center">
        {exercise.type === 'mcq' && (
          <div className="grid gap-2">
            {exercise.options?.map((option, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedOption(option)}
                className={`p-3 text-left text-sm border transition-all rounded-lg ${selectedOption === option
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'border-slate-800 bg-slate-900/50 text-slate-500 hover:border-slate-700'
                  }`}
              >
                <span className="opacity-30 mr-2">{idx}#</span> {option}
              </button>
            ))}
          </div>
        )}

        {exercise.type === 'dragdrop' && (
          <div className="flex flex-col gap-4">
            <div className="p-4 border-2 border-dashed border-slate-800 rounded-lg min-h-15 flex flex-wrap gap-2 bg-black/20">
              {selectedOption ? (
                <span className="text-cyan-400">{selectedOption}</span>
              ) : (
                <span className="text-slate-600 text-xs self-center">SELECT_LOGIC_BLOCKS...</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {exercise.options?.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedOption(opt)}
                  className="px-3 py-1 bg-slate-800 border border-slate-700 rounded text-cyan-500 text-xs cursor-pointer hover:bg-slate-700 hover:border-cyan-500"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}

        {exercise.type === 'code' && (
          <div className="flex flex-col gap-2">
            <CodeEditor
              language={exercise.language}
              initialValue={exercise.starterCode || ""}
              onChange={(value) => setSelectedOption(value)}
              placeholder="Escreva sua solução aqui..."
            />
          </div>
        )}
      </div>

      {/* FEEDBACK DE ERRO / ANTI-SPAM */}
      {errorMessage && (
        <div className="p-2 border border-red-900/50 bg-red-950/20 text-red-500 text-[10px] uppercase animate-pulse">
          {errorMessage}
        </div>
      )}

      <button
        onClick={() => handleValidation(exercise.type === 'code' ? (selectedOption || '') : (selectedOption || ''))}
        disabled={!selectedOption}
        className="mt-2 w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 rounded font-black text-xs transition-all uppercase"
      >
        Execute_Validation
      </button>
    </div>
  );
}
