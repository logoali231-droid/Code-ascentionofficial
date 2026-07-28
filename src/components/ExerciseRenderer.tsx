"use client";

import { useEffect, useMemo, useState } from "react";
import CodeEditor from "./CodeEditor";

import {
  evaluateExerciseCode,
} from "@/lib/others/exerciseEvaluator";

import { GibberishDetector } from "@/lib/anti-spam/gibberish-detector";
import { identifyCourseBrain } from "@/lib/brain/courseBrain";
import { getAdaptiveMetrics } from "@/lib/others/adaptive";
import { getUser } from "@/lib/others/db";
import { calculateLevel, computeLessonXp } from "@/lib/others/level";
import { getConceptMastery, updateMastery } from "@/lib/others/mastery";
import { Language } from "@/lib/sandbox/engines";



const detector = new GibberishDetector();

type ExerciseType = "code" | "mcq" | "ordering" | "quiz" | "dragdrop";

interface ExpectedAnswer {
  codeTemplate?: string;
  solutionExample?: string;
  mandatoryTokens?: string[];
  allowedVariations?: string[];
}
interface ExerciseExpectedAnswer {
  codeTemplate?: string;
  solutionExample?: string;
  entryFunction?: string;
  mandatoryTokens?: string[];
  allowedVariations?: string[];

  tests?: Array<{
    input: unknown[];
    expectedOutput: unknown;
  }>;
}

interface Exercise {
  id: string;
  type: ExerciseType;
  language: Language | "plaintext";

  question: string;
  answer: string;

  codeSnippet?: string;
  starterCode?: string;

  explanation?: string;
  options?: string[];

  expectedAnswer?: ExerciseExpectedAnswer;

  concept?: string;
  topic?: string;
  difficulty?: number;
}

interface ExerciseRendererProps {
  rawExercise: any;

  loading?: boolean;

  onComplete?: (success: boolean) => void;

  onNext?: (success: boolean, value: string, xpGain?: number) => Promise<void>;

  course?: {
    topic: string;
    id: string;
  };

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

  const [showHint, setShowHint] = useState(false);

  const [codeValue, setCodeValue] = useState("");

  const [dragTokens, setDragTokens] = useState<string[]>([]);

  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);

  const [computedMetrics, setComputedMetrics] = useState<any>(null);

  const [mutatedType, setMutatedType] = useState<ExerciseType>("mcq");

  const [user, setUser] = useState<any>(null);

  const [conceptMastery, setConceptMastery] = useState<any>(null);

  const [isValidating, setIsValidating] = useState(false);

  const [isCompleted, setIsCompleted] = useState(false);

  const courseId = course?.id;

  /* =========================================================
     USER
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        const currentUser = await getUser();

        if (mounted) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error("[EXERCISE] Failed to load user:", error);
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================================================
     CONCEPT MASTERY
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    async function loadConceptMastery() {
      const conceptId =
        rawExercise?.concept || rawExercise?.topic || rawExercise?.id;

      if (!conceptId) {
        setConceptMastery(null);
        return;
      }

      try {
        const mastery = await getConceptMastery(conceptId);

        if (mounted) {
          setConceptMastery(mastery);
        }
      } catch (error) {
        console.error("[EXERCISE] Failed to load concept mastery:", error);
      }
    }

    loadConceptMastery();

    return () => {
      mounted = false;
    };
  }, [rawExercise]);

  const globalMastery = user?.mastery ?? 0;

  const globalConfidence = user?.confidence ?? 0;

  const streak = user?.streak ?? 0;

  /* =========================================================
     ADAPTIVE TOPOLOGY
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    async function fetchTopology() {
      if (!rawExercise) {
        return;
      }

      try {
        const baseDifficulty = Number(rawExercise.difficulty) || 2;

        const metrics = await getAdaptiveMetrics(
          baseDifficulty,
          course?.id || "core_fundamentals",
        );

        if (cancelled) {
          return;
        }

        setComputedMetrics(metrics);

        const mastery = conceptMastery?.mastery ?? 0;

        const confidence = conceptMastery?.confidence ?? 0;

        let currentDifficulty = Number(metrics?.difficulty) || baseDifficulty;

        /*
         * Small adaptive adjustment based on
         * the current concept, not the entire course.
         */
        if (confidence > 0.5 && mastery > 0.85) {
          currentDifficulty += 1;
        }

        if (confidence > 0.5 && mastery < 0.4) {
          currentDifficulty -= 1;
        }

        currentDifficulty = Math.max(1, Math.min(5, currentDifficulty));

        const originalType = normalizeExerciseType(rawExercise.type);

        /*
         * Easier state:
         * code can become ordering/dragdrop.
         *
         * Harder state:
         * code remains the strongest format.
         */
        if (currentDifficulty < 2.2) {
          if (originalType === "code") {
            setMutatedType("ordering");
          } else {
            setMutatedType(originalType);
          }
        } else if (currentDifficulty > 4.2) {
          setMutatedType("code");
        } else {
          setMutatedType(originalType);
        }
      } catch (error) {
        console.error("[EXERCISE] Adaptive topology failed:", error);

        if (!cancelled) {
          setMutatedType(normalizeExerciseType(rawExercise?.type));
        }
      }
    }

    fetchTopology();

    return () => {
      cancelled = true;
    };
  }, [rawExercise, course?.id, conceptMastery]);

  /* =========================================================
     NORMALIZED EXERCISE
  ========================================================= */

  const exercise: Exercise = useMemo(() => {
    const expected = rawExercise?.expectedAnswer || {};

    const type = normalizeExerciseType(mutatedType || rawExercise?.type);

    return {
      id: String(rawExercise?.id || ""),

      type,

      language: rawExercise?.language || "plaintext",

      question: String(rawExercise?.question || ""),

      answer: String(rawExercise?.answer || expected?.solutionExample || ""),

      codeSnippet: rawExercise?.codeSnippet,

      starterCode: rawExercise?.starterCode || expected?.codeTemplate || "",

      explanation: rawExercise?.explanation,

      options: Array.isArray(rawExercise?.options) ? rawExercise.options : [],

      expectedAnswer: expected,

      concept: rawExercise?.concept,

      topic: rawExercise?.topic,

      difficulty: Number(rawExercise?.difficulty) || 2,
    };
  }, [rawExercise, mutatedType]);

  useEffect(() => {
    if (!rawExercise) {
      return;
    }

    setCodeValue(
      rawExercise?.starterCode ||
        rawExercise?.expectedAnswer?.codeTemplate ||
        "",
    );

    setSelectedOption(null);
    setSelectedTokens([]);
    setErrorMessage(null);
    setShowHint(false);
    setIsValidating(false);
    setIsCompleted(false);

    /*
     * Ordering / dragdrop options.
     *
     * Prefer options supplied by the AI.
     * Only fall back to answer tokens if
     * the AI didn't provide options.
     */
    let optionsArray: string[] = Array.isArray(rawExercise?.options)
      ? rawExercise.options
          .filter(
            (value: unknown): value is string =>
              typeof value === "string" && value.trim().length > 0,
          )
          .map((value: string) => value.trim())
      : [];

    if (optionsArray.length === 0 && typeof rawExercise?.answer === "string") {
      optionsArray = rawExercise.answer
        .split(/\s+/)
        .map((token: string) => token.trim())
        .filter(Boolean);
    }

    /*
     * Remove duplicates while preserving
     * the original order.
     */
    optionsArray = Array.from(new Set(optionsArray));

    /*
     * Shuffle only for the available pool.
     */
    setDragTokens([...optionsArray].sort(() => Math.random() - 0.5));
  }, [rawExercise, mutatedType]);

  /* =========================================================
     ANSWER HELPERS
  ========================================================= */

  function normalizeText(value: string): string {
    return value
      .replace(/\r\n/g, "\n")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function normalizeCode(value: string): string {
    return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  }

  function compareText(userValue: string, correctValue: string): boolean {
    return normalizeText(userValue) === normalizeText(correctValue);
  }

  function validateCodeAnswer(value: string): boolean {
    const submitted = normalizeCode(value);

    if (!submitted) {
      return false;
    }

    const expected = exercise.expectedAnswer;

    /*
     * If the generator supplied mandatory
     * tokens, use them as the structural
     * contract.
     */
    const mandatoryTokens = expected?.mandatoryTokens || [];

    const missingTokens = mandatoryTokens.filter(
      (token) => token && !submitted.includes(token),
    );

    if (missingTokens.length > 0) {
      return false;
    }

    /*
     * If there is a reference implementation,
     * accept an exact normalized match.
     */
    const solution = expected?.solutionExample || exercise.answer;

    if (solution && compareCodeLoosely(submitted, normalizeCode(solution))) {
      return true;
    }

    /*
     * If mandatory tokens exist and all are
     * present, allow the student's valid
     * structural variation.
     *
     * This is intentionally NOT claiming
     * semantic correctness.
     */
    if (mandatoryTokens.length > 0 && missingTokens.length === 0) {
      return true;
    }

    return false;
  }

  function compareCodeLoosely(a: string, b: string): boolean {
    const normalize = (code: string) =>
      code
        .replace(/\/\/.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\s+/g, "")
        .replace(/;+/g, ";")
        .trim();

    return normalize(a) === normalize(b);
  }

  /* =========================================================
     VALIDATION ENGINE
  ========================================================= */

  const handleValidation = async (value: string) => {
    if (isValidating || isCompleted) {
      return;
    }

    const submittedValue = value?.trim();

    if (!submittedValue) {
      setErrorMessage("Digite ou selecione uma resposta.");
      return;
    }

    setErrorMessage(null);
    setIsValidating(true);

    try {
      /*
       * Anti-gibberish only for code.
       */
      if (
        exercise.type === "code" &&
        detector.isTotalGibberish(submittedValue, "lesson")
      ) {
        setErrorMessage("Entrada inválida detectada.");

        setShowHint(true);
        onComplete?.(false);

        return;
      }

      let isCorrect = false;

      /* =========================
         MCQ / QUIZ
      ========================= */

      if (exercise.type === "mcq" || exercise.type === "quiz") {
        isCorrect = compareText(submittedValue, exercise.answer);
      } else if (exercise.type === "ordering" || exercise.type === "dragdrop") {
        /* =========================
         ORDERING / DRAGDROP
      ========================= */
        const submittedOrder = selectedTokens.join(" ");

        isCorrect = compareText(submittedOrder, exercise.answer);
      } else if (exercise.type === "code") {
        /* =========================
         CODE
      ========================= */
        isCorrect = validateCodeAnswer(submittedValue);
      }

      const conceptId =
        rawExercise?.concept ||
        rawExercise?.topic ||
        rawExercise?.id ||
        "unknown";

      /* =========================
         INCORRECT
      ========================= */

      if (!isCorrect) {
        onComplete?.(false);

        await updateMastery({
          conceptId,
          success: false,
        });

        setShowHint(true);

        setErrorMessage(
          exercise.type === "code"
            ? "A solução ainda não atende aos requisitos do exercício."
            : "Resposta incorreta.",
        );

        return;
      }

      /* =========================
         SUCCESS
      ========================= */

      let xpMultiplier = computedMetrics?.xpMultiplier || 1.2;

      const mastery = conceptMastery?.mastery ?? 0;

      if (mastery > 0.85) {
        xpMultiplier *= 0.75;
      }

      if (mastery < 0.4) {
        xpMultiplier *= 1.4;
      }

      const currentXp = user?.xp || 0;

      const currentLevel = calculateLevel(currentXp);

      const dynamicXp = Math.round(
        computeLessonXp(
          currentLevel,
          (computedMetrics?.difficulty || exercise.difficulty || 2) * 0.1,
          streak || 1,
          1,
        ) * xpMultiplier,
      );

      await updateMastery({
        conceptId,
        success: true,
      });

      setIsCompleted(true);
      setErrorMessage(null);
      setShowHint(false);

      onComplete?.(true);

      if (onNext) {
        await onNext(true, submittedValue, dynamicXp);
      }

      /*
       * Course brain is deliberately consulted
       * AFTER the exercise has been completed.
       * It does not generate the next exercise
       * itself.
       */
      try {
        const brain = await identifyCourseBrain({
          courseId: courseId || "default",

          globalMastery,
          globalConfidence,
          streak,
        });

        switch (brain.state) {
          case "COURSE_COMPLETE":
          case "REVIEW_MODE":
          case "CONTINUE_LESSONS":
          case "DIFFICULTY_SHIFT":
          case "REGENERATE_COURSE":
            break;

          default:
            break;
        }
      } catch (error) {
        /*
         * Brain failure must not invalidate
         * an already correct exercise.
         */
        console.warn("[EXERCISE] Course brain unavailable:", error);
      }
    } catch (error) {
      console.error("[EXERCISE] Validation failed:", error);

      setErrorMessage("Não foi possível validar a resposta. Tente novamente.");

      onComplete?.(false);
    } finally {
      setIsValidating(false);
    }
  };

  /* =========================================================
     ORDERING TOKENS
  ========================================================= */

  const addToken = (token: string, index: number) => {
    setSelectedTokens((previous) => [...previous, token]);

    setDragTokens((previous) =>
      previous.filter((_, currentIndex) => currentIndex !== index),
    );
  };

  const removeToken = (token: string, index: number) => {
    setSelectedTokens((previous) =>
      previous.filter((_, currentIndex) => currentIndex !== index),
    );

    setDragTokens((previous) => [...previous, token]);
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading || !exercise.id) {
    return (
      <div className="p-6 border border-[#1e293b] bg-[#020617]/50 animate-pulse rounded-xl font-mono text-[#06b6d4]">
        INITIALIZING...
      </div>
    );
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="flex flex-col gap-4 p-5 border border-white/10 bg-black/40 rounded-xl font-mono text-slate-200">
      {/* QUESTION */}

      <div className="text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
        {exercise.question}
      </div>

      {/* CODE */}

      {exercise.type === "code" && (
        <div className="flex flex-col gap-3">
          {exercise.codeSnippet && (
            <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/50 p-3 text-xs text-slate-300">
              <code>{exercise.codeSnippet}</code>
            </pre>
          )}

          <CodeEditor
            initialValue={codeValue}
            onChange={(value) => setCodeValue(value || "")}
            language={exercise.language}
          />

          <button
            type="button"
            disabled={isValidating || isCompleted || !codeValue.trim()}
            onClick={() => handleValidation(codeValue)}
            className="
              rounded-lg
              bg-cyan-700
              px-4
              py-2
              text-sm
              font-bold
              text-white
              transition
              hover:bg-cyan-600
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {isValidating
              ? "VALIDATING..."
              : isCompleted
                ? "✓ CORRECT"
                : "CHECK"}
          </button>
        </div>
      )}

      {/* MCQ */}

      {exercise.type === "mcq" && (
        <div className="flex flex-col gap-2">
          {exercise.options?.map((option, index) => {
            const selected = selectedOption === option;

            return (
              <button
                key={`${option}-${index}`}
                type="button"
                disabled={isValidating || isCompleted}
                onClick={() => setSelectedOption(option)}
                className={`
                    rounded-lg
                    border
                    px-4
                    py-3
                    text-left
                    text-sm
                    transition
                    ${
                      selected
                        ? "border-cyan-500 bg-cyan-950/50 text-cyan-200"
                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    }
                  `}
              >
                {option}
              </button>
            );
          })}

          <button
            type="button"
            disabled={!selectedOption || isValidating || isCompleted}
            onClick={() => {
              if (selectedOption) {
                handleValidation(selectedOption);
              }
            }}
            className="
              mt-2
              rounded-lg
              bg-cyan-700
              px-4
              py-2
              text-sm
              font-bold
              text-white
              hover:bg-cyan-600
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {isValidating
              ? "VALIDATING..."
              : isCompleted
                ? "✓ CORRECT"
                : "SUBMIT"}
          </button>
        </div>
      )}

      {/* ORDERING / DRAGDROP */}

      {(exercise.type === "ordering" || exercise.type === "dragdrop") && (
        <div className="flex flex-col gap-4">
          <div>
            <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">
              Your answer
            </div>

            <div className="min-h-14 rounded-lg border border-cyan-900/50 bg-cyan-950/10 p-2">
              {selectedTokens.length === 0 ? (
                <span className="text-xs text-slate-600">
                  Select the pieces below in the correct order.
                </span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedTokens.map((token, index) => (
                    <button
                      key={`${token}-${index}`}
                      type="button"
                      disabled={isValidating || isCompleted}
                      onClick={() => removeToken(token, index)}
                      className="
                          rounded
                          border
                          border-cyan-800
                          bg-cyan-950/50
                          px-2
                          py-1
                          text-xs
                          text-cyan-200
                          hover:bg-cyan-900
                        "
                    >
                      {token}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">
              Available pieces
            </div>

            <div className="flex flex-wrap gap-2">
              {dragTokens.map((token, index) => (
                <button
                  key={`${token}-${index}`}
                  type="button"
                  disabled={isValidating || isCompleted}
                  onClick={() => addToken(token, index)}
                  className="
                      rounded
                      border
                      border-white/10
                      bg-white/5
                      px-2
                      py-1.5
                      text-xs
                      text-slate-300
                      hover:bg-white/10
                    "
                >
                  {token}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={
              selectedTokens.length === 0 || isValidating || isCompleted
            }
            onClick={() => handleValidation(selectedTokens.join(" "))}
            className="
              rounded-lg
              bg-cyan-700
              px-4
              py-2
              text-sm
              font-bold
              text-white
              hover:bg-cyan-600
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {isValidating
              ? "VALIDATING..."
              : isCompleted
                ? "✓ CORRECT"
                : "CHECK ORDER"}
          </button>
        </div>
      )}

      {/* ERROR */}

      {errorMessage && (
        <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-3 text-xs text-red-400">
          {errorMessage}
        </div>
      )}

      {/* HINT / EXPLANATION */}

      {showHint && exercise.explanation && (
        <div className="rounded-lg border border-cyan-900/40 bg-cyan-950/10 p-3 text-xs leading-relaxed text-cyan-300">
          <strong>Hint:</strong> {exercise.explanation}
        </div>
      )}

      {/* SUCCESS */}

      {isCompleted && (
        <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3 text-sm text-emerald-400">
          ✓ Exercise completed.
        </div>
      )}
    </div>
  );
}

/* =========================================================
   TYPE NORMALIZATION
========================================================= */

function normalizeExerciseType(type: unknown): ExerciseType {
  switch (type) {
    case "code":
      return "code";

    case "mcq":
    case "multiple_choice":
      return "mcq";

    case "ordering":
      return "ordering";

    case "dragdrop":
      return "dragdrop";

    case "quiz":
      return "quiz";

    default:
      return "mcq";
  }
}
