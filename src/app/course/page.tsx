"use client";
"use client";

import { useEffect, useState } from "react";

import {
  updateUser,
  db,
  getErrorLogs,
  clearErrorLog,
  getUser,
} from "@/lib/db";

import {
  streamLesson,
} from "@/lib/lessonStreamer";

import {
  generateReinforcement,
} from "@/lib/reinforce";

import ExerciseRenderer from "@/components/ExerciseRenderer";

import {
  generateExplanationAI,
  explainError,
} from "@/lib/explanationAI";

import {
  updateMemory,
} from "@/lib/userMemory";

export default function CoursePage() {
  const [course, setCourse] =
    useState<any>(null);

  const [user, setUser] =
    useState<any>(null);

  const [mode, setMode] =
    useState<
      "practice" | "reinforce"
    >("practice");

  const [
    currentLesson,
    setCurrentLesson,
  ] = useState(0);

  const [
    currentExercise,
    setCurrentExercise,
  ] = useState(0);

  const [tab, setTab] =
    useState<
      "practice" |
      "theory" |
      "errors"
    >("practice");

  const [title, setTitle] =
    useState("Course");

  const [daily, setDaily] =
    useState<any>({
      progress: 0,
      goal: 5,
      completed: false,
    });

  const [streak, setStreak] =
    useState(0);

  const [lessonTree, setLessonTree] =
    useState<any[]>([]);

  /* =====================================================
     STREAMING STATES
  ===================================================== */

  const [
    streamedExplanation,
    setStreamedExplanation,
  ] = useState("");

  const [
    streamedExercises,
    setStreamedExercises,
  ] = useState<any[]>([]);

  const [
    isGeneratingExplanation,
    setIsGeneratingExplanation,
  ] = useState(false);

  const [
    isGeneratingExercises,
    setIsGeneratingExercises,
  ] = useState(false);

  const [
    streamProgress,
    setStreamProgress,
  ] = useState(0);

  const [
    loadingCourse,
    setLoadingCourse,
  ] = useState(true);

  useEffect(() => {
    load();
  }, []);

  /* =====================================================
     LOAD
  ===================================================== */

  async function load() {
    setLoadingCourse(true);

    const userData =
      await getUser();

    setUser(userData);

    const activeCourseId =
      userData?.activeCourse;

    setStreak(
      userData?.streak || 0
    );

    const dailyData =
      await db.daily.get(
        "daily_main"
      );

    if (dailyData) {
      setDaily(dailyData);
    }

    if (!activeCourseId) {
      setLoadingCourse(false);
      return;
    }

    const found =
      await db.courses.get(
        activeCourseId
      );

    if (!found) {
      setLoadingCourse(false);
      return;
    }

    setCourse(found);

    setLessonTree(
      found.lessons || []
    );

    setCurrentLesson(
      found.currentLesson || 0
    );

    setCurrentExercise(
      found.currentExercise || 0
    );

    setTitle(
      found.topic ||
        found.title ||
        "Course"
    );

    /* ============================================
       STREAM GENERATION
    ============================================ */

    await startStreamingLesson(
      found
    );

    setLoadingCourse(false);
  }

  /* =====================================================
     STREAM LESSON
  ===================================================== */

 async function startStreamingLesson(
  currentCourse: any
) {
  try {
    setStreamedExplanation("");

    setStreamedExercises([]);

    setIsGeneratingExplanation(
      true
    );

    setIsGeneratingExercises(
      true
    );

    setStreamProgress(0);

    /* ====================================
       STREAM LESSON
    ==================================== */

    const streamed =
      await streamLesson({
        course: currentCourse,

        concept:
          currentCourse.topic ||
          currentCourse.title,

        difficulty:
          currentCourse.difficulty ||
          1,

        exerciseCount: 3,

        onExercise(
          exercise,
          index
        ) {
          setStreamedExercises(
            (prev) => [
              ...prev,
              exercise,
            ]
          );

          setStreamProgress(
            40 +
              (index + 1) *
                20
          );
        },
      });

    /* ====================================
       THEORY EXPLANATION AI
    ==================================== */

    const enhancedTheory =
      await generateExplanationAI({
        lesson: streamed,

        history:
          currentCourse.lessons ||
          [],

        user,

        course:
          currentCourse,
      });

    setStreamedExplanation(
      enhancedTheory ||
        streamed.explanation
    );

    setIsGeneratingExplanation(
      false
    );

    setIsGeneratingExercises(
      false
    );

    setStreamProgress(100);

  } catch (err) {
    console.error(
      "[STREAM]",
      err
    );

    setIsGeneratingExplanation(
      false
    );

    setIsGeneratingExercises(
      false
    );
  }
}

  /* =====================================================
     NEXT
  ===================================================== */

 async function handleNext(
  correct: boolean
) {
  if (!course) return;

  const exercise =
    streamedExercises[
      currentExercise
    ];

  /* ====================================
     MEMORY
  ==================================== */

  await updateMemory({
    topic:
      course.topic ||
      course.title,

    correct,

    type: "exercise",

    input:
      exercise?.question ||
      "",
  });

  /* ====================================
     XP
  ==================================== */

  if (correct) {
    const xpGain = 10;

    const newXp =
      (user?.xp || 0) +
      xpGain;

    await updateUser({
      xp: newXp,

      coins:
        (user?.coins || 0) + 2,

      level:
        Math.floor(
          newXp / 100
        ) + 1,
    });

    /* ================================
       CLEAR ERROR LOGS
    ================================= */

    const errors =
      await getErrorLogs(
        course.id
      );

    const matching =
      errors.find(
        (e: any) =>
          e.question ===
          exercise.question
      );

    if (matching?.id) {
      await clearErrorLog(
        matching.id
      );
    }

  } else {
    /* ================================
       REINFORCEMENT
    ================================= */

    const reinforcement =
      await generateReinforcement(
        {
          ...exercise,
          difficulty: 0.6,
        },
        course
      );

    setStreamedExercises(
      (prev) => {
        const clone = [
          ...prev,
        ];

        clone.splice(
          currentExercise + 1,
          0,
          reinforcement
        );

        return clone;
      }
    );
  }

  /* ====================================
     NEXT EXERCISE
  ==================================== */

  const next =
    currentExercise + 1;

  if (
    next >=
    streamedExercises.length
  ) {
    await startStreamingLesson(
      course
    );

    setCurrentExercise(0);

    return;
  }

  setCurrentExercise(next);

  const freshUser =
    await getUser();

  setUser(freshUser);
}

  /* =====================================================
     LOADING
  ===================================================== */

  if (loadingCourse) {
    return (
      <div className="p-6 text-sm opacity-70">
        Booting neural course engine...
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6">
        Course not found.
      </div>
    );
  }

  const currentStreamExercise =
    streamedExercises[
      currentExercise
    ];

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div className="p-4 pb-24">

      {/* HEADER */}

      <div className="flex justify-between text-xs mb-3">
        <h1 className="text-cyan-400 font-black uppercase tracking-widest">
          {title}
        </h1>

        <div className="flex gap-3">
          <span className="text-orange-400">
            🔥 {streak}
          </span>

          <span className="text-yellow-400">
            🎯 {daily.progress || 0}/
            {daily.goal || 5}
          </span>
        </div>
      </div>

      {/* STREAM BAR */}

      <div className="w-full h-2 rounded bg-slate-800 overflow-hidden mb-5">
        <div
          className="h-full bg-cyan-500 transition-all duration-500"
          style={{
            width: `${streamProgress}%`,
          }}
        />
      </div>

      {/* STATUS */}

      <div className="mb-5 text-xs space-y-1 opacity-80">
        <p>
          [
          {isGeneratingExplanation
            ? "..."
            : "✓"}
          ] explanation
        </p>

        <p>
          [
          {isGeneratingExercises
            ? "..."
            : "✓"}
          ] exercises
        </p>
      </div>

      {/* TABS */}

      <div className="flex gap-2 mb-5">
        {[
          "practice",
          "theory",
          "errors",
        ].map((t) => (
          <button
            key={t}
            onClick={() =>
              setTab(t as any)
            }
            className={`flex-1 p-2 rounded-xl capitalize transition-all ${
              tab === t
                ? "bg-cyan-600"
                : "bg-slate-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* PRACTICE */}

      {tab === "practice" && (
        <>
          {!currentStreamExercise ? (
            <div className="p-5 text-sm opacity-60">
              Generating exercise...
            </div>
          ) : (
            <ExerciseRenderer
              exercise={
                currentStreamExercise
              }
              onNext={handleNext}
              course={course}
              isStreaming={
                isGeneratingExercises
              }
              streamProgress={
                streamProgress
              }
            />
          )}
        </>
      )}

      {/* THEORY */}

      {tab === "theory" && (
        <div className="bg-slate-900 border border-cyan-900/40 p-5 rounded-2xl">
          <h2 className="text-cyan-400 font-bold mb-3">
            Neural Theory Feed
          </h2>

          {isGeneratingExplanation &&
          !streamedExplanation ? (
            <p className="animate-pulse text-sm opacity-70">
              Synthesizing explanation...
            </p>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {streamedExplanation}
            </p>
          )}
        </div>
      )}

      {/* ERRORS */}

      {tab === "errors" && (
        <ErrorsTab
          course={course}
        />
      )}
    </div>
  );
}

/* =========================================================
   ERRORS TAB
========================================================= */

function ErrorsTab({
  course,
}: {
  course: any;
}) {
  const [errors, setErrors] =
    useState<any[]>([]);

  const [
    aiExplanations,
    setAiExplanations,
  ] = useState<
    Record<number, string>
  >({});

  useEffect(() => {
    async function loadErrors() {
      const e =
        await getErrorLogs(
          course.id
        );

      const last =
        e.slice(-5);

      setErrors(last);

      const results =
        await Promise.all(
          last.map((err: any) =>
            explainError({
              ...err,
              course,
            }).catch(
              () =>
                "Failed to explain."
            )
          )
        );

      const map:
        Record<number, string> =
        {};

      results.forEach(
        (res, i) => {
          map[i] = res;
        }
      );

      setAiExplanations(map);
    }

    loadErrors();
  }, [course]);

  return (
    <div className="space-y-3">
      {errors.map(
        (err, i) => (
          <div
            key={i}
            className="bg-slate-900 p-4 rounded-xl border-l-4 border-red-500"
          >
            <p className="text-xs text-red-400 font-bold mb-2">
              ❌ {err.question}
            </p>

            <p className="text-green-400 text-xs">
              ✔ {err.correct}
            </p>

            {aiExplanations[
              i
            ] && (
              <p className="text-cyan-300 text-xs mt-3 whitespace-pre-wrap">
                🧠{" "}
                {
                  aiExplanations[
                    i
                  ]
                }
              </p>
            )}
          </div>
        )
      )}

      {errors.length === 0 && (
        <div className="p-6 border border-dashed border-slate-700 rounded-xl text-center opacity-50">
          No critical failures detected.
        </div>
      )}
    </div>
  );
}