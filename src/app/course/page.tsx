"use client";

import nextDynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import {
  db,
  get,
  getErrorLogs,
  clearErrorLog,
  getUser,
} from "@/lib/others/db";

import { explainError } from "@/lib/others/explanationAI";
import { updateMemory } from "@/lib/others/userMemory";
import { statisticalValidator } from "@/lib/anti-spam/statististical-validator";

const ExerciseRenderer = nextDynamic(
  () => import("@/components/ExerciseRenderer"),
  { ssr: false }
);

const loadEngine = async () => {
  const mod = await import("@/lib/others/webllm");
  return mod.initEngine;
};

export default function CoursePage() {
  const abortControllerRef =
    useRef<AbortController | null>(null);

  const isMountedRef = useRef(true);

  const [course, setCourse] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  const [currentExercise, setCurrentExercise] =
    useState(0);

  const [tab, setTab] = useState<
  "practice" |
  "theory" |
  "review" |
  "mistakes"
>("practice");

  const [title, setTitle] = useState("Course");

  const [daily, setDaily] = useState<any>({
    progress: 0,
    goal: 5,
    completed: false,
  });

  const [streak, setStreak] = useState(0);

  const [downloadInfo, setDownloadInfo] = useState({
    text: "",
    model: "",
  });

  const [consecutiveErrors, setConsecutiveErrors] =
    useState(0);

  /* =====================================================
     STREAMING STATES
  ===================================================== */

  const [streamedExplanation, setStreamedExplanation] =
    useState("");

  const [streamedExercises, setStreamedExercises] =
    useState<any[]>([]);

  const [
    isGeneratingExplanation,
    setIsGeneratingExplanation,
  ] = useState(false);

  const [
    isGeneratingExercises,
    setIsGeneratingExercises,
  ] = useState(false);

  const [streamProgress, setStreamProgress] =
    useState(0);

  const [loadingCourse, setLoadingCourse] =
    useState(true);

  /* =====================================================
     SAFE STATE UPDATE HELPERS
  ===================================================== */

  function safeSetState(fn: () => void) {
    if (!isMountedRef.current) return;
    fn();
  }

  /* =====================================================
     LOAD + CLEANUP
  ===================================================== */

  useEffect(() => {
    isMountedRef.current = true;

    const controller = new AbortController();

    abortControllerRef.current = controller;

    async function load() {
      try {
        safeSetState(() => {
          setLoadingCourse(true);
        });

        console.log("[COURSE] Starting load()");

        const userData = await getUser();

        if (controller.signal.aborted) return;

        console.log("[COURSE] User loaded");

        safeSetState(() => {
          setUser(userData);
          setStreak(userData?.streak || 0);
        });

        const activeCourseId =
          userData?.activeCourse;

        const dailyData = await db.daily.get(
          "daily_main"
        );

        if (controller.signal.aborted) return;

        if (dailyData) {
          safeSetState(() => {
            setDaily(dailyData);
          });
        }

        if (!activeCourseId) {
          safeSetState(() => {
            setLoadingCourse(false);
          });

          return;
        }

        const found = await db.courses.get(
          activeCourseId
        );

        if (controller.signal.aborted) return;

        if (!found) {
          safeSetState(() => {
            setLoadingCourse(false);
          });

          return;
        }

        safeSetState(() => {
          setCourse(found);
          setCurrentExercise(
            found.currentExercise || 0
          );

          setTitle(
            found.topic ||
            found.title ||
            "Course"
          );
        });

        console.log(
          "[COURSE] Initializing WebLLM engine..."
        );

        const initEngine = await loadEngine();



        await initEngine(undefined, (report) => {
          if (controller.signal.aborted) return;

          setDownloadInfo({
            text: report.text,
            model: "Neural Engine v1.0",
          });
        });

        console.log("[COURSE] initEngine FINISHED");

        if (controller.signal.aborted) return;

        await startStreamingLesson(
          found,
          controller.signal
        );

        if (
          !controller.signal.aborted &&
          isMountedRef.current
        ) {
          safeSetState(() => {
            setLoadingCourse(false);
          });
        }

      } catch (err) {
        console.error(
          "[COURSE LOAD ERROR]",
          err
        );

        safeSetState(() => {
          setLoadingCourse(false);
        });
      }
    }

    load();

    return () => {
      isMountedRef.current = false;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      (async () => {
        try {
          const { unloadEngine } =
            await import(
              "@/lib/others/modelManager"
            );

          await unloadEngine();

          console.log(
            "[COURSE] Engine unloaded"
          );
        } catch (err) {
          console.error(
            "[COURSE UNLOAD ERROR]",
            err
          );
        }
      })();
    };
  }, []);

  /* =====================================================
     STREAM LESSON
  ===================================================== */

  async function startStreamingLesson(
    currentCourse: any,
    signal?: AbortSignal
  ) {
    let heartbeatInterval:
      | ReturnType<typeof setInterval>
      | null = null;

    let timeout:
      | ReturnType<typeof setTimeout>
      | null = null;
    try {
      console.log(
        "[STREAM] Starting lesson stream pipeline"
      );

      safeSetState(() => {
        setStreamedExplanation("");
        setStreamedExercises([]);

        setIsGeneratingExplanation(true);
        setIsGeneratingExercises(true);

        setStreamProgress(0);
      });

      if (signal?.aborted) return;

      /* ====================================
         HEARTBEAT
      ==================================== */

      let heartbeat = 0;
      heartbeatInterval = setInterval(() => {
        if (
          signal?.aborted ||
          !isMountedRef.current
        ) {
          return;
        }

        heartbeat++;

        console.log(
          `%c[HEARTBEAT] Pipeline alive (${heartbeat * 5
          }s)`,
          "color: cyan"
        );

        safeSetState(() => {
          setDownloadInfo({
            text:
              `NEURAL ENGINE ACTIVE • ` +
              `PROCESSING TOKENS • ${heartbeat * 5
              }s`,
            model: "Neural Engine v1.0",
          });
        });
      }, 5000);

      /* ====================================
         SAFETY TIMEOUT
      ==================================== */

      timeout = setTimeout(() => {
        if (
          signal?.aborted ||
          !isMountedRef.current
        ) {
          return;
        }

        console.error(
          "[TIMEOUT] Generation taking longer than expected"
        );

        safeSetState(() => {
          setDownloadInfo({
            text:
              "MODEL LOAD DELAY DETECTED • STILL PROCESSING...",
            model: "Neural Engine v1.0",
          });
        });
      }, 15000);

      /* ====================================
         LESSON STREAM
      ==================================== */

      console.log(
        "[STREAM] Importing lessonStreamer"
      );

      const { streamLesson } = await import(
        "@/lib/others/lessonStreamer"
      );

      if (signal?.aborted) return;

      console.log(
        "[STREAM] lessonStreamer imported"
      );

      const streamed = await streamLesson({
        course: currentCourse,

        concept:
          currentCourse.topic ||
          currentCourse.title,

        difficulty:
          currentCourse.difficulty || 1,

        exerciseCount: 3,

        signal,

        onExercise(exercise, index) {
          if (
            signal?.aborted ||
            !isMountedRef.current
          ) {
            return;
          }

          console.log(
            `[STREAM] Exercise ${index + 1
            } received`
          );

          safeSetState(() => {
            setStreamedExercises((prev) => [
              ...prev,
              exercise,
            ]);

            setStreamProgress(
              40 + (index + 1) * 20
            );
          });
        },
      });

      if (signal?.aborted) return;

      console.log(
        "[STREAM] streamLesson complete"
      );

      /* ====================================
         LOAD HISTORY
      ==================================== */

      const rawHistory = await db
        .table("lessons")
        .where("courseId")
        .equals(currentCourse.id)
        .toArray();

      if (signal?.aborted) return;

      const historyLessons =
        rawHistory.map(
          (record) => record.content
        );

      console.log(
        `[AI] Loaded ${historyLessons.length
        } previous lessons`
      );

      /* ====================================
         EXPLANATION AI
      ==================================== */

      const { generateExplanationAI } =
        await import(
          "@/lib/others/explanationAI"
        );

      if (signal?.aborted) return;

      const explanationStream =
        await generateExplanationAI({
          lesson: streamed,
          history: historyLessons,
          user,
          course: currentCourse,
        });

      if (signal?.aborted) return;

      /* ====================================
         STREAM TOKENS
      ==================================== */

      if (
        explanationStream &&
        typeof explanationStream ===
        "object" &&
        Symbol.asyncIterator in
        explanationStream
      ) {
        let fullText = "";
        let tokenCount = 0;

        console.log(
          "[AI] Streaming tokens..."
        );

        for await (const chunk of explanationStream as any) {
          if (
            signal?.aborted ||
            !isMountedRef.current
          ) {
            return;
          }

          const content =
            chunk.choices?.[0]?.delta?.content || "";

          fullText += content;

          tokenCount++;

          if (tokenCount % 10 === 0) {
            safeSetState(() => {
              setDownloadInfo({
                text: `GENERATING THEORY • ${tokenCount} CHUNKS`,
                model: "Neural Engine v1.0",
              });
            });
          }

          if (tokenCount % 5 === 0) {
            safeSetState(() => {
              setStreamedExplanation(fullText);
            });
          }
        }

        safeSetState(() => {
          setStreamedExplanation(fullText);
        });

        console.log(
          "[AI] Token stream complete"
        );
      } else {
        console.log(
          "[AI] Non-stream response"
        );

        if (signal?.aborted) return;

        safeSetState(() => {
          setStreamedExplanation(
            (explanationStream as string) ||
            streamed.explanation
          );
        });
      }

      safeSetState(() => {
        setStreamProgress(100);

        setIsGeneratingExplanation(
          false
        );

        setIsGeneratingExercises(false);
      });

      console.log(
        "[STREAM] Lesson pipeline complete"
      );
    } catch (error: any) {
      console.error(
        "[FATAL STREAM ERROR]",
        error
      );

      if (
        error?.name === "AbortError" ||
        error?.message === "Aborted"
      ) {
        console.log(
          "%c[STREAM] Pipeline aborted safely",
          "color: #00ffcc"
        );

        return;
      }

      safeSetState(() => {
        setConsecutiveErrors(
          (prev) => prev + 1
        );

        setIsGeneratingExplanation(
          false
        );

        setIsGeneratingExercises(false);

        setDownloadInfo({
          text:
            "NEURAL LINK FAILURE DETECTED",
          model: "Neural Engine v1.0",
        });
      });

      if (consecutiveErrors >= 2) {
        alert(
          "📡 LINK NEURAL INSTÁVEL: O motor de IA falhou. Recarregando módulos..."
        );

        window.location.reload();
      }
    } finally {
      if (heartbeatInterval) {
        clearInterval(
          heartbeatInterval
        );
      }

      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  /* =====================================================
     NEXT EXERCISE
  ===================================================== */

  async function handleNext(
    correct: boolean,
    userResponse?: string,
    xpGainFromExercise?: number
  ) {
    if (!course) return;

    if (userResponse) {
      const isSpam =
        statisticalValidator.isLowEntropy(
          userResponse
        );

      if (isSpam) {
        alert(
          "⚠️ NEURAL_ERROR: Resposta inconsistente detectada."
        );

        return;
      }
    }

    const exercise =
      streamedExercises[currentExercise];

    await updateMemory({
      topic:
        course.topic || course.title,

      correct,

      type: "exercise",

      input:
        exercise?.question || "",
    });

    const {
      updateMastery,
      updateConfidence,
    } = await import(
      "@/lib/others/curriculumState"
    );

    const {
      addXP,
      addCoins,
    } = await import(
      "@/lib/others/economy"
    );

    const {
      saveMemorySummary,
      shouldUpdateSummary,
    } = await import(
      "@/lib/others/contextMemory"
    );

    if (correct) {
      safeSetState(() => {
        setConsecutiveErrors(0);
      });

      const xpGain =
        xpGainFromExercise ?? 10;

      safeSetState(() => {
        setStreak((prev) => prev + 1);
      });

      await addXP(xpGain);

      await addCoins(2);

      if (
        course?.id &&
        exercise?.topic
      ) {
        await updateMastery(
          course.id,
          exercise.topic,
          10
        );

        await updateConfidence(
          course.id,
          exercise.topic,
          5
        );
      }

      const lessonCount =
        await db
          .table("lessons")
          .where("courseId")
          .equals(course?.id)
          .count();

      const currentLessonCount =
        lessonCount + 1;

      if (
        shouldUpdateSummary(
          currentLessonCount
        ) &&
        course?.id
      ) {
        const freshUserMemory =
          await get(
            "user",
            "main"
          );

        const rawLessons =
          await db
            .table("lessons")
            .where("courseId")
            .equals(course.id)
            .toArray();

        const courseLessons =
          rawLessons.map(
            (record) =>
              record.content
          );

        await saveMemorySummary(
          course.id,
          {
            lessons:
              courseLessons,

            memory:
              freshUserMemory,

            mastery:
              freshUserMemory?.mastery ||
              0,
          }
        );
      }

      const errors =
        await getErrorLogs(course.id);

      const matching =
        errors.find(
          (e: any) =>
            e.question ===
            exercise.question
        );

      if (
        matching &&
        matching.id !== undefined
      ) {
        await clearErrorLog(
          matching.id
        );
      }
    } else {
      if (
        course?.id &&
        exercise?.topic
      ) {
        await updateConfidence(
          course.id,
          exercise.topic,
          -8
        );
      }

      const newErrorCount =
        consecutiveErrors + 1;

      safeSetState(() => {
        setConsecutiveErrors(
          newErrorCount
        );
      });

      if (newErrorCount >= 3) {
        safeSetState(() => {
          setConsecutiveErrors(0);
          setTab("theory");
        });

        alert(
          "🧠 NEURAL GLITCH: Muitas falhas consecutivas."
        );

        return;
      }

      const {
        generateReinforcement,
      } = await import(
        "@/lib/others/reinforce"
      );

      const reinforcement =
        await generateReinforcement(
          {
            ...exercise,
            difficulty: 0.6,
          },
          course
        );

      safeSetState(() => {
        setStreamedExercises(
          (prev) => {
            const clone = [
              ...prev,
            ];

            const reinforcementCount =
              clone.filter(
                (e) =>
                  e.isReinforcement
              ).length;

            if (
              reinforcementCount < 5
            ) {
              clone.splice(
                currentExercise + 1,
                0,
                {
                  ...reinforcement,
                  isReinforcement:
                    true,
                }
              );
            }

            return clone;
          }
        );
      });
    }

    const next =
      currentExercise + 1;

    if (
      next >=
      streamedExercises.length
    ) {
      if (
        abortControllerRef.current
      ) {
        abortControllerRef.current.abort();
      }

      const nextController =
        new AbortController();

      abortControllerRef.current =
        nextController;

      await startStreamingLesson(
        course,
        nextController.signal
      );

      safeSetState(() => {
        setCurrentExercise(0);
      });

      return;
    }

    safeSetState(() => {
      setCurrentExercise(next);
    });

    const freshUser =
      await getUser();

    safeSetState(() => {
      setUser(freshUser);
    });
  }

  /* =====================================================
     LOADING
  ===================================================== */

  if (loadingCourse) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-cyan-400 font-mono">
        <div className="relative w-64 h-2 bg-slate-900 border border-cyan-900/30 mb-4 overflow-hidden">
          <div
            className="absolute inset-0 bg-cyan-500 animate-pulse-fast"
            style={{
              width:
                downloadInfo.text.includes(
                  "%"
                )
                  ? downloadInfo.text
                    .split("%")[0]
                    .split("[")[1] +
                  "%"
                  : "10%",
            }}
          />
        </div>

        <div className="text-[10px] uppercase tracking-[0.2em] animate-pulse">
          {downloadInfo.text ||
            "Initializing Core..."}
        </div>

        <div className="mt-4 max-w-md text-center">
          <p className="text-[11px] text-cyan-300 animate-pulse">
            Neural engine is compiling
            local AI pipelines.
          </p>

          <p className="mt-2 text-[9px] text-cyan-700">
            Large local models may
            require 20-90 seconds
            depending on GPU and
            shader compilation.
          </p>
        </div>
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

      <div className="w-full h-2 rounded bg-slate-800 overflow-hidden mb-5">
        <div
          className="h-full bg-cyan-500 transition-all duration-500"
          style={{
            width: `${streamProgress}%`,
          }}
        />
      </div>

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

      <div className="flex gap-2 mb-5">
        {[
          "practice",
          "theory",
          "review",
          "mistakes",
        ].map((t) => (
          <button
            key={t}
            onClick={() =>
              setTab(t as any)
            }
            className={`flex-1 p-2 rounded-xl capitalize transition-all ${tab === t
              ? "bg-cyan-600"
              : "bg-slate-800"
              }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "practice" && (
        <>
          {!currentStreamExercise ? (
            <div className="p-5 text-sm opacity-60">
              Generating
              exercise...
            </div>
          ) : (
            <ExerciseRenderer
              rawExercise={
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

      {tab === "theory" && (
        <div className="bg-slate-900 border border-cyan-900/40 p-5 rounded-2xl">
          <h2 className="text-cyan-400 font-bold mb-3">
            Neural Theory Feed
          </h2>

          {isGeneratingExplanation &&
            !streamedExplanation ? (
            <p className="animate-pulse text-sm opacity-70">
              Synthesizing
              explanation...
            </p>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {
                streamedExplanation
              }
            </p>
          )}
        </div>
      )}

     {tab === "review" && (
  <ReviewTab
    course={course}
  />
)}



{tab === "mistakes" && (
  <MistakesTab
    course={course}
  />
)}
    </div>
  );
}

function ReviewTab({
  course,
}: {
  course: any;
}) {
  const [reviewExercises, setReviewExercises] =
    useState<any[]>([]);
  const [currentReview, setCurrentReview] =
  useState(0);

  useEffect(() => {
    if (!course?.id) return;
    async function load() {
      const errors =
        await getErrorLogs(course.id);

      const review =
        errors
          .slice(-10)
          .map((e) => ({
            ...e,
            isReview: true,
          }));

      setReviewExercises(review);
    }

    load();
  }, [course]);

  return (
    <div className="space-y-4">
      {reviewExercises.length === 0 ? (
        <div className="p-6 text-center opacity-60">
          No review exercises available.
        </div>
      ) : (
        <ExerciseRenderer
  rawExercise={
    reviewExercises[currentReview]
  }
  onNext={() => {
  if (
    currentReview <
    reviewExercises.length - 1
  ) {
    setCurrentReview(
      prev => prev + 1
    );
  } else {
    alert("✅ Review completed");
  }
}}
  course={course}
  isStreaming={false}
  streamProgress={100}
/>
      )}
    </div>
  );
}

function MistakesTab({
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
    if (!course?.id) return;
    let mounted = true;

    async function loadErrors() {
      const e = await getErrorLogs(
        course.id
      );

      if (!mounted) return;

      const last = e.slice(-5);

      setErrors(last);

      const results: string[] = [];

      for (const err of last) {
        try {
          const explanation =
            await explainError({
              ...err,
              course,
            });

          results.push(
            typeof explanation ===
              "string"
              ? explanation
              : "Explanation processing..."
          );
        } catch {
          results.push(
            "Failed to explain."
          );
        }
      }

      if (!mounted) return;

      const map: Record<
        number,
        string
      > = {};

      results.forEach(
        (res, i) => {
          map[i] = res ?? "";
        }
      );

      setAiExplanations(map);
    }

    loadErrors();

    return () => {
      mounted = false;
    };
  }, [course]);

  return (
    <div className="space-y-3">
      {errors.map((err, i) => (
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

          {aiExplanations[i] && (
            <p className="text-cyan-300 text-xs mt-3 whitespace-pre-wrap">
              🧠{" "}
              {
                aiExplanations[i]
              }
            </p>
          )}
        </div>
      ))}

      {errors.length === 0 && (
        <div className="p-6 border border-dashed border-slate-700 rounded-xl text-center opacity-50">
          No critical failures
          detected.
        </div>
      )}
    </div>
  );
}
