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

/* =========================================================
   TYPES
========================================================= */

interface Exercise {
  id?: string;

  question: string;

  options: string[];

  answer: string;

  explanation: string;

  codeSnippet?: string;
}

interface ExerciseProps {
  exercise?: Exercise | null;

  rarity?: string;

  course?: any;

  loading?: boolean;

  streamIndex?: number;

  streamTotal?: number;

  isStreaming?: boolean;

  streamProgress?: number;

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

  onComplete,

  onNext,
}: ExerciseProps) {
  const [selected, setSelected] =
    useState<string | null>(
      null
    );

  const [status, setStatus] =
    useState<
      | "idle"
      | "checking"
      | "success"
      | "error"
    >("idle");

  const [revealed, setRevealed] =
    useState(false);

  /* =====================================================
     RESET BETWEEN STREAMED EXERCISES
  ===================================================== */

  useEffect(() => {
    setSelected(null);

    setStatus("idle");

    setRevealed(false);
  }, [exercise?.id]);

  /* =====================================================
     LOADING STATE
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

        <div className="space-y-3">
          <div className="h-14 bg-slate-800 rounded-xl" />
          <div className="h-14 bg-slate-800 rounded-xl" />
          <div className="h-14 bg-slate-800 rounded-xl" />
          <div className="h-14 bg-slate-800 rounded-xl" />
        </div>

        <div className="mt-6 flex items-center gap-2 text-cyan-700">
          <Zap
            size={14}
            className="animate-pulse"
          />

          <span className="text-[10px] uppercase tracking-widest">
            Neural_Stream_Active
          </span>
        </div>
      </div>
    );
  }

  /* =====================================================
     CHECK ANSWER
  ===================================================== */

  const handleCheck =
    async (opt: string) => {
      if (
        status === "success" ||
        status === "checking"
      ) {
        return;
      }

      setSelected(opt);

      setStatus("checking");

      playSound("click", 0.2);

      await new Promise((r) =>
        setTimeout(r, 600)
      );

      const isCorrect =
        opt === exercise.answer;

      await updateLearningState(
        exercise.id || "gen",

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
        }, 900);

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
      {/* ===================================================
          HEADER
      =================================================== */}

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
              {streamIndex}/
              {streamTotal}
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

      {/* ===================================================
          QUESTION
      =================================================== */}

      <h2 className="text-xl font-bold mb-6 text-slate-100 italic uppercase leading-tight">
        {exercise.question}
      </h2>

      {/* ===================================================
          CODE BLOCK
      =================================================== */}

      {exercise.codeSnippet && (
        <pre className="bg-black/50 p-4 rounded-lg mb-6 text-cyan-300 text-xs overflow-x-auto border border-slate-800/50">
          <code>
            {exercise.codeSnippet}
          </code>
        </pre>
      )}

      {/* ===================================================
          OPTIONS
      =================================================== */}

      <div className="space-y-3">
        {exercise.options.map(
          (opt, i) => (
            <button
              key={i}
              onClick={() =>
                handleCheck(opt)
              }
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

                {status ===
                  "success" &&
                  opt ===
                    exercise.answer && (
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

      {/* ===================================================
          EXPLANATION
      =================================================== */}

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

      {/* ===================================================
          STREAM FOOTER
      =================================================== */}

      {streamTotal > 0 &&
        streamIndex <
          streamTotal && (
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