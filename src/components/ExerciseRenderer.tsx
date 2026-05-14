"use client";

import React, { useState } from 'react';
import { addXP } from '@/lib/updateUser';

// 1. Definição do Tipo do Exercício
interface Exercise {
  id: string;
  type: 'code' | 'quiz' | 'dragdrop' | 'mcq';
  language: string;
  question: string;
  answer: string;
  codeSnippet?: string;
  starterCode?: string;
  explanation?: string;
  options?: string[]; // Obrigatório para MCQ
}

// 2. Definição das Props (Isso resolve os erros de "Cannot find name")
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

  // Mapeia o objeto da IA para o nosso tipo Exercise
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
    if (!value) return;
    const isCorrect = value.trim() === exercise.answer.trim();
    
    if (isCorrect) {
      await addXP(25);
      onComplete?.(true);
      if (onNext) await onNext(true, value);
    } else {
      onComplete?.(false);
    }
  };

  if (loading || !exercise.id) {
    return (
      <div className="p-6 border border-slate-800 bg-slate-950/50 animate-pulse rounded-xl font-mono text-cyan-500">
        INITIALIZING_NEURAL_LINK...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 border border-slate-800 bg-black/40 rounded-xl font-mono">
      {/* Header com Status */}
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
      
      {/* Lógica de Renderização por Tipo */}
      {exercise.type === 'mcq' ? (
        <div className="grid gap-2">
          {exercise.options?.map((option, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedOption(option)}
              className={`p-3 text-left text-sm border transition-all rounded-lg ${
                selectedOption === option 
                ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400' 
                : 'border-slate-800 bg-slate-900/50 text-slate-500 hover:border-slate-700'
              }`}
            >
              <span className="opacity-30 mr-2">{idx}#</span> {option}
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
           <code className="text-emerald-500 text-xs">{exercise.codeSnippet || '// CODE_BUFFER_EMPTY'}</code>
        </div>
      )}

      <button 
        onClick={() => handleValidation(exercise.type === 'mcq' ? (selectedOption || '') : exercise.answer)}
        disabled={exercise.type === 'mcq' && !selectedOption}
        className="mt-2 w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 rounded font-black text-xs transition-all uppercase"
      >
        Execute_Validation
      </button>
    </div>
  );
}