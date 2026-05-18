"use client";

import React, { useState, useEffect } from 'react';
import { computeLessonXp, calculateLevel } from '@/lib/level';
import { getUser } from '@/lib/db';
import CodeEditor from './CodeEditor';
import { GibberishDetector } from "@/lib/anti-spam/gibberish-detector";
import { getAdaptiveMetrics } from '@/lib/adaptive';
import { Language } from "@/lib/sandbox/types";

const detector = new GibberishDetector();

interface Exercise {
  id: string;
  type: 'code' | 'quiz' | 'dragdrop' | 'mcq';
  language: Language | "plaintext";
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
  const [codeValue, setCodeValue] = useState<string>('');
  
  const [dragTokens, setDragTokens] = useState<string[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);

  const [computedMetrics, setComputedMetrics] = useState<any>(null);
  const [mutatedType, setMutatedType] = useState<'code' | 'quiz' | 'dragdrop' | 'mcq'>('code');

  useEffect(() => {
    async function fetchTopology() {
      if (!rawExercise) return;
      
      try {
        const baseDiff = rawExercise.difficulty || 2; 
        const metrics = await getAdaptiveMetrics(baseDiff, course?.id || "core_fundamentals");
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
  }, [rawExercise, course?.id]);

  useEffect(() => {
    if (rawExercise) {
      setCodeValue(rawExercise.starterCode || '');
      setSelectedOption(null);
      setErrorMessage(null);
      setSelectedTokens([]);

      let optionsArray: string[] = rawExercise.options || [];
      if (optionsArray.length === 0) {
        optionsArray = Array.from(new Set([
          ...rawExercise.answer.split(/[\s{}();]+/).filter((x: string) => x.length > 0),
          "undefined",
          "null",
          "return"
        ])).slice(0, 6);
      }
      setDragTokens([...optionsArray].sort(() => Math.random() - 0.5));
    }
  }, [rawExercise, mutatedType]);

  const exercise: Exercise = {
    id: rawExercise?.id || '',
    language: rawExercise?.language || 'plaintext',
    question: rawExercise?.question || '',
    answer: rawExercise?.answer || '',
    options: rawExercise?.options || [],
    ...rawExercise,
    type: mutatedType 
  };

  const handleValidation = async (value: string) => {
    setErrorMessage(null);
    if (!value) return;

    if (exercise.type === 'code' && detector.isTotalGibberish(value, 'lesson')) {
      setErrorMessage("RUÍDO NEURAL DETECTADO: Input inválido para processamento.");
      onComplete?.(false);
      return; 
    }

    const finalCleanValue = value.trim().replace(/\s+/g, ' ');
    const finalCleanAnswer = exercise.answer.trim().replace(/\s+/g, ' ');

    const isCorrect = finalCleanValue === finalCleanAnswer;

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
      } else if (exercise.type === 'dragdrop') {
        setErrorMessage("SEQUÊNCIA LOGICA INCORRETA: O compilador rejeitou a ordem dos blocos.");
      } else {
        setErrorMessage("COMBINAÇÃO DE LÓGICA INCORRETA. Tente outra alternativa.");
      }
    }
  };

  const addToken = (token: string, index: number) => {
    setSelectedTokens([...selectedTokens, token]);
    setDragTokens(dragTokens.filter((_, i) => i !== index));
    setErrorMessage(null);
  };

  const removeToken = (token: string, index: number) => {
    setDragTokens([...dragTokens, token]);
    setSelectedTokens(selectedTokens.filter((_, i) => i !== index));
    setErrorMessage(null);
  };

  if (loading || !exercise.id) {
    return (
      <div className="p-6 border border-[#1e293b] bg-[#020617]/50 animate-pulse rounded-xl font-mono text-[#06b6d4]">
        INITIALIZING_NEURAL_LINK...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-5 border border-white/10 bg-black/40 rounded-xl font-mono text-slate-200">
      <div className="flex justify-between items-center border-b border-white/5 pb-2 text-[10px] text-slate-500 font-bold">
        <div>TOPOLOGY: <span className="text-[#00f2ff]">{exercise.type.toUpperCase()}</span></div>
        {computedMetrics && (
          <div className="flex gap-3">
            <span>DIFF: <span className="text-[#ff0055]">{computedMetrics.difficulty.toFixed(2)}</span></span>
            <span>MULT: <span className="text-[#00ff88]">x{computedMetrics.xpMultiplier.toFixed(1)}</span></span>
          </div>
        )}
      </div>

      <div className="text-sm leading-relaxed text-slate-300 my-2">
        {exercise.question}
      </div>

      {exercise.type === 'code' && (
        <div className="w-full border border-white/5 rounded-lg overflow-hidden">
          <CodeEditor
            initialValue={codeValue}
            onChange={(val) => setCodeValue(val || '')}
            language={exercise.language}
          />
          <div className="p-3 bg-[#050505] border-t border-white/5 flex justify-end">
            <button
              onClick={() => handleValidation(codeValue)}
              className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff]/30 hover:bg-[#00f2ff]/30 rounded transition-all"
            >
              EXECUTE_SCRIPT
            </button>
          </div>
        </div>
      )}

      {exercise.type === 'dragdrop' && (
        <div className="flex flex-col gap-4 w-full">
          {exercise.codeSnippet && (
            <pre className="p-3 bg-black/60 border border-white/5 rounded text-xs text-emerald-400 overflow-x-auto">
              <code>{exercise.codeSnippet}</code>
            </pre>
          )}

          <div className="min-h-16 w-full p-3 bg-black/50 border border-dashed border-white/10 rounded-lg flex flex-wrap gap-2 items-center">
            {selectedTokens.length === 0 ? (
              <span className="text-xs text-slate-600 select-none italic">Selecione os blocos abaixo para ordenar...</span>
            ) : (
              selectedTokens.map((token, index) => (
                <button
                  key={index}
                  onClick={() => removeToken(token, index)}
                  className="px-3 py-1.5 text-xs font-bold bg-[#00f2ff]/20 text-[#00f2ff] border border-[#00f2ff]/40 rounded hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40 transition-all duration-150"
                >
                  {token}
                </button>
              ))
            )}
          </div>

          <div className="w-full p-3 bg-[#050505] border border-white/5 rounded-lg flex flex-wrap gap-2">
            {dragTokens.map((token, index) => (
              <button
                key={index}
                onClick={() => addToken(token, index)}
                className="px-3 py-1.5 text-xs font-bold bg-slate-900 border border-white/5 text-slate-300 rounded hover:border-[#00f2ff]/30 hover:text-white transition-all"
              >
                {token}
              </button>
            ))}
          </div>

          <div className="mt-2 flex justify-end">
            <button
              disabled={selectedTokens.length === 0}
              onClick={() => handleValidation(selectedTokens.join(' '))}
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded border transition-all ${
                selectedTokens.length > 0
                  ? 'bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/30 hover:bg-[#00ff88]/30 cursor-pointer'
                  : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
              }`}
            >
              COMPILE_BLOCKS
            </button>
          </div>
        </div>
      )}

      {(exercise.type === 'quiz' || exercise.type === 'mcq') && (
        <div className="flex flex-col gap-2">
          {exercise.codeSnippet && (
            <pre className="p-3 bg-black/60 border border-white/5 rounded text-xs text-emerald-400 overflow-x-auto mb-2">
              <code>{exercise.codeSnippet}</code>
            </pre>
          )}
          
          <div className="grid grid-cols-1 gap-2">
            {exercise.options?.map((option, index) => (
              <button
                key={index}
                onClick={() => {
                  setSelectedOption(option);
                  setErrorMessage(null);
                }}
                className={`p-3 text-left text-xs rounded border transition-all ${
                  selectedOption === option
                    ? 'bg-[#00f2ff]/10 text-[#00f2ff] border-[#00f2ff]/40'
                    : 'bg-black/20 text-slate-400 border-white/5 hover:border-white/10 hover:text-slate-200'
                }`}
              >
                <span className="text-slate-600 mr-2 font-bold">[{index}]</span> {option}
              </button>
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              disabled={!selectedOption}
              onClick={() => selectedOption && handleValidation(selectedOption)}
              className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded border transition-all ${
                selectedOption
                  ? 'bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/30 hover:bg-[#00ff88]/30 cursor-pointer'
                  : 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
              }`}
            >
              SUBMIT_DECISION
            </button>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 mt-2 text-xs border border-red-500/20 bg-red-500/10 text-red-400 rounded">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
