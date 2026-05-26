"use client";

import { GibberishDetector } from "@/lib/anti-spam/gibberish-detector";
import { getAdaptiveMetrics } from "@/lib/others/adaptive";
import { getUser } from "@/lib/others/db";
import { calculateLevel, computeLessonXp } from "@/lib/others/level";
import { Language } from "@/lib/sandbox/engines";
import { useEffect, useState } from "react";
import CodeEditor from "./CodeEditor";
import { identifyCourseBrain } from "@/lib/brain/courseBrain";

const detector = new GibberishDetector();

interface Exercise {
  id: string;
  type: "code" | "quiz" | "dragdrop" | "mcq";
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
  rarity = "COMMON",
}: ExerciseRendererProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [codeValue, setCodeValue] = useState<string>("");

  const [dragTokens, setDragTokens] = useState<string[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);

  const [computedMetrics, setComputedMetrics] = useState<any>(null);
  const [mutatedType, setMutatedType] = useState<
    "code" | "quiz" | "dragdrop" | "mcq"
  >("code");

  const [user, setUser] = useState<any>(null);

  const courseId = course?.id;

  // =========================
  // USER LOAD (FIX PRINCIPAL)
  // =========================
  useEffect(() => {
    async function loadUser() {
      const u = await getUser();
      setUser(u);
    }
    loadUser();
  }, []);

  const globalMastery = user?.mastery ?? 0;
  const globalConfidence = user?.confidence ?? 0;
  const streak = user?.streak ?? 0;

  // =========================
  // ADAPTIVE TOPOLOGY
  // =========================
  useEffect(() => {
    async function fetchTopology() {
      if (!rawExercise) return;

      try {
        const baseDiff = rawExercise.difficulty || 2;

        const metrics = await getAdaptiveMetrics(
          baseDiff,
          course?.id || "core_fundamentals"
        );

        setComputedMetrics(metrics);

        const currentDifficulty = metrics.difficulty;

        if (currentDifficulty < 2.2) {
          setMutatedType(
            rawExercise.type === "code"
              ? "dragdrop"
              : rawExercise.type || "mcq"
          );
        } else if (currentDifficulty > 4.2) {
          setMutatedType("code");
        } else {
          setMutatedType(rawExercise.type || "code");
        }
      } catch (err) {
        console.error(err);
        setMutatedType(rawExercise.type || "code");
      }
    }

    fetchTopology();
  }, [rawExercise, course?.id]);

  // =========================
  // RESET EXERCISE STATE
  // =========================
  useEffect(() => {
    if (!rawExercise) return;

    setCodeValue(rawExercise.starterCode || "");
    setSelectedOption(null);
    setErrorMessage(null);
    setSelectedTokens([]);

    let optionsArray: string[] = rawExercise.options || [];

    if (optionsArray.length === 0) {
      optionsArray = Array.from(
        new Set([
          ...rawExercise.answer
            .split(/[\s{}();]+/)
            .filter((x: string) => x.length > 0),
          "undefined",
          "null",
          "return",
        ])
      ).slice(0, 6);
    }

    setDragTokens([...optionsArray].sort(() => Math.random() - 0.5));
  }, [rawExercise, mutatedType]);

  const exercise: Exercise = {
    id: rawExercise?.id || "",
    language: rawExercise?.language || "plaintext",
    question: rawExercise?.question || "",
    answer: rawExercise?.answer || "",
    options: rawExercise?.options || [],
    ...rawExercise,
    type: mutatedType,
  };

  // =========================
  // VALIDATION ENGINE
  // =========================
  const handleValidation = async (value: string) => {
    setErrorMessage(null);
    if (!value) return;

    if (
      exercise.type === "code" &&
      detector.isTotalGibberish(value, "lesson")
    ) {
      setErrorMessage("Input inválido detectado.");
      onComplete?.(false);
      return;
    }

    const cleanValue = value.trim().replace(/\s+/g, " ");
    const cleanAnswer = exercise.answer.trim().replace(/\s+/g, " ");

    const isCorrect = cleanValue === cleanAnswer;

    if (!isCorrect) {
      onComplete?.(false);
      setErrorMessage("Resposta incorreta.");
      return;
    }

    const xpMultiplier = computedMetrics?.xpMultiplier || 1.2;

    const currentXp = user?.xp || 0;
    const currentLevel = calculateLevel(currentXp);

    const dynamicXp = Math.round(
      computeLessonXp(
        currentLevel,
        (computedMetrics?.difficulty || 2) * 0.1,
        streak || 1,
        1
      ) * xpMultiplier
    );

    onComplete?.(true);

    if (onNext) {
      await onNext(true, value, dynamicXp);

      const brain = await identifyCourseBrain({
        courseId: courseId || "default",
        globalMastery,
        globalConfidence,
        streak,
      });

      switch (brain.state) {
        case "COURSE_COMPLETE":
          break;
        case "REVIEW_MODE":
          break;
        case "CONTINUE_LESSONS":
          break;
        case "DIFFICULTY_SHIFT":
          break;
        case "REGENERATE_COURSE":
          break;
      }
    }
  };

  // =========================
  // TOKENS
  // =========================
  const addToken = (token: string, index: number) => {
    setSelectedTokens([...selectedTokens, token]);
    setDragTokens(dragTokens.filter((_, i) => i !== index));
  };

  const removeToken = (token: string, index: number) => {
    setDragTokens([...dragTokens, token]);
    setSelectedTokens(selectedTokens.filter((_, i) => i !== index));
  };

  // =========================
  // LOADING
  // =========================
  if (loading || !exercise.id) {
    return (
      <div className="p-6 border border-[#1e293b] bg-[#020617]/50 animate-pulse rounded-xl font-mono text-[#06b6d4]">
        INITIALIZING...
      </div>
    );
  }

  // =========================
  // RENDER
  // =========================
  return (
    <div className="flex flex-col gap-4 p-5 border border-white/10 bg-black/40 rounded-xl font-mono text-slate-200">

      <div className="text-sm text-slate-300">
        {exercise.question}
      </div>

      {exercise.type === "code" && (
        <div>
          <CodeEditor
            initialValue={codeValue}
            onChange={(val) => setCodeValue(val || "")}
            language={exercise.language}
          />

          <button
            onClick={() => handleValidation(codeValue)}
          >
            RUN
          </button>
        </div>
      )}

      {exercise.type === "quiz" && (
        <div>
          {exercise.options?.map((opt, i) => (
            <button
              key={i}
              onClick={() => setSelectedOption(opt)}
            >
              {opt}
            </button>
          ))}

          <button
            disabled={!selectedOption}
            onClick={() =>
              selectedOption && handleValidation(selectedOption)
            }
          >
            SUBMIT
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="text-red-400 text-xs">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
