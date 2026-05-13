"use client";

import { useEffect, useState } from "react";

import { playSound } from "@/lib/sounds";
import { addXP } from "@/lib/updateUser";
import { updateLearningState } from "@/lib/learningState";

import {
  CheckCircle2,
  Loader2,
  Terminal,
  Trophy,
  Zap,
} from "lucide-react";

import CodeEditor from "./CodeEditor";

import {
  compareAnswers,
  compareCode
} from "@/lib/evaluator.logic";

/* =========================================================
   TYPES
========================================================= */

interface Exercise {
  id?: string;

  type?:
    | "mcq"
    | "text"
    | "code"
    | "output"
    | "project";

  language?: string;

  question: string;

  options?: string[];

  answer?: string;

  explanation?: string;

  codeSnippet?: string;

  starterCode?: string;

  expectedOutput?: string;
}

interface ExerciseProps {
  exercise?: Exercise | null;

  rarity?: string;

  course?: any;

  loading?: boolean;

  streamIndex?: number;

  streamTotal?: number;

  isStreaming: boolean;

  streamProgress: number;

  onComplete?: (
    success: boolean
  ) => void;

  onNext?: (
    success: boolean
  ) => Promise<void> | void;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function ExerciseRenderer({
  exercise,
  rarity = "Common",
  course,
  loading = false,
  streamIndex = 0,
  streamTotal = 0,
  isStreaming,
  streamProgress,
  onComplete,
  onNext,
}: ExerciseProps) {

  const [selected, setSelected] =
    useState<string | null>(null);

  const [status, setStatus] =
    useState<
      | "idle"
      | "checking"
      | "success"
      | "error"
    >("idle");

  const [revealed, setRevealed] =
    useState(false);

  const [codeAnswer, setCodeAnswer] =
    useState("");

  useEffect(() => {

    setSelected(null);

    setStatus("idle");

    setRevealed(false);

    setCodeAnswer(
      exercise?.starterCode || ""
    );

  }, [exercise?.id]);

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading || !exercise) {
    return (
      <div className="p-6 rounded-2xl border-2 border-cyan-900/30 bg-slate-900/40 animate-pulse">

        <div className="flex items-center justify-between mb-6">

          <div className="flex items-center gap-2 text-cyan-500">
            <Loader2
              size={14}
              className="animate-spin"
            />

            <span className="text-[10px] font-black uppercase tracking-widest">
              Generating_Exercise
            </span>
          </div>

          <div className="text-[10px] text-slate-600 font-bold">
            {streamIndex}/{streamTotal}
          </div>

        </div>

        <div className="h-6 w-3/4 bg-slate-800 rounded mb-6" />

      </div>
    );
  }

  /* =====================================================
     VALIDATION
  ===================================================== */

  const handleValidation =
    async (value: string) => {

      if (
        status === "checking" ||
        status === "success"
      ) {
        return;
      }

      setStatus("checking");

      playSound("click", 0.2);

      await new Promise((r) =>
        setTimeout(r, 450)
      );

      let isCorrect = false;

      if (exercise.type === "code") {

        isCorrect = compareCode(
          exercise.answer || "",
          value,
          exercise.language
        );

      } else {

        isCorrect = compareAnswers(
          exercise.answer || "",
          value
        );

      }

      await updateLearningState(
        exercise.id || "generated",
        isCorrect,
        2
      );

      if (isCorrect) {

        setStatus("success");

        setRevealed(true);

        playSound(
          "success",
          0.5
        );

        await addXP(25);

        onComplete?.(true);

        if (onNext) {
          await onNext(true);
        }

      } else {

        setStatus("error");

        playSound(
          "error",
          0.4
        );

        setTimeout(() => {
          setStatus("idle");
        }, 1000);

        onComplete?.(false);
      }
    };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div
      className={`p-6 rounded-2xl border-2 bg-slate-900/40 transition-all duration-300 ${
        status === "success"
          ? "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
          : "border-slate-800"
      }`}
    >

      {/* HEADER */}

      <div className="flex justify-between mb-6">

        <div className="flex items-center gap-2 text-slate-500">

          <Terminal
            size={14}
            className="text-cyan-500"
          />

          <span className="text-[10px] font-bold tracking-widest uppercase">
            {course?.topic
              ? `${course.topic}_${rarity}`
              : `${rarity}_NODE`}
          </span>

        </div>

        <div className="flex items-center gap-3">

          {streamTotal > 0 && (
            <span className="text-[10px] text-slate-600 font-black">
              {streamIndex}/{streamTotal}
            </span>
          )}

          {status === "success" && (
            <Trophy
              size={16}
              className="text-yellow-500 animate-bounce"
            />
          )}

        </div>

      </div>

      {/* QUESTION */}

      <h2 className="text-xl font-bold mb-6 text-slate-100 italic uppercase leading-tight">
        {exercise.question}
      </h2>

      {/* CODE SNIPPET */}

      {exercise.codeSnippet && (
        <pre className="bg-black/50 p-4 rounded-lg mb-6 text-cyan-300 text-xs overflow-x-auto border border-slate-800/50">
          <code>
            {exercise.codeSnippet}
          </code>
        </pre>
      )}

      {/* =====================================================
          CODE EXERCISE
      ===================================================== */}

      {exercise.type === "code" && (

        <div className="space-y-4">

          <CodeEditor
            language={
              exercise.language || "plaintext"
            }
            initialValue={codeAnswer}
            onChange={setCodeAnswer}
          />

          <button
            onClick={() =>
              handleValidation(codeAnswer)
            }
            disabled={status === "checking"}
            className="
              px-5
              py-3
              rounded-xl
              bg-cyan-500/10
              border
              border-cyan-500/30
              text-cyan-300
              hover:bg-cyan-500/20
              transition-all
            "
          >
            Validate Solution
          </button>

        </div>
      )}

      {/* =====================================================
          MCQ EXERCISE
      ===================================================== */}

      {exercise.type !== "code" && (

        <div className="space-y-3">

          {exercise.options?.map(
            (opt, i) => (

              <button
                key={i}
                onClick={() => {
                  setSelected(opt);
                  handleValidation(opt);
                }}
                disabled={
                  status !== "idle" &&
                  status !== "error"
                }
                className={`w-full p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                  selected === opt
                    ? status === "error"
                      ? "border-red-500 bg-red-950/20"
                      : "border-cyan-500 bg-cyan-950/10"
                    : "border-slate-800 hover:border-slate-700 bg-slate-900/20"
                }`}
              >

                <div className="flex justify-between items-center">

                  <span
                    className={
                      selected === opt
                        ? "text-white"
                        : "text-slate-400"
                    }
                  >
                    {opt}
                  </span>

                  {status === "success" &&
                    opt === exercise.answer && (
                      <CheckCircle2
                        size={18}
                        className="text-green-500"
                      />
                    )}

                </div>

              </button>

            )
          )}

        </div>
      )}

      {/* =====================================================
          EXPLANATION
      ===================================================== */}

      {revealed && (

        <div className="mt-8 p-5 bg-cyan-950/10 border border-cyan-900/30 rounded-xl animate-in fade-in duration-500">

          <p className="text-[10px] font-black text-cyan-500 uppercase mb-2 tracking-tighter italic">
            Analysis_Result:
          </p>

          <p className="text-sm text-slate-300 italic leading-relaxed">
            {exercise.explanation}
          </p>

        </div>
      )}

      {/* FOOTER */}

      {streamTotal > 0 &&
        streamIndex < streamTotal && (

          <div className="mt-6 flex items-center gap-2 text-slate-600">

            <Loader2
              size={12}
              className="animate-spin"
            />

            <span className="text-[10px] uppercase tracking-widest">
              Waiting_Next_Node
            </span>

          </div>
        )}

    </div>
  );
}