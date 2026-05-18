"use client";

import { initEngine } from "@/lib/webllm"; // <-- ADICIONADO

import { unloadEngine } from "@/lib/modelManager"; // <-- ADICIONADO

import { useEffect, useState } from "react";

import { updateUser, db, getErrorLogs, clearErrorLog, getUser } from "@/lib/db";

import { streamLesson } from "@/lib/lessonStreamer";

import { generateReinforcement } from "@/lib/reinforce";

import ExerciseRenderer from "@/components/ExerciseRenderer";

import { generateExplanationAI, explainError } from "@/lib/explanationAI";

import { updateMemory } from "@/lib/userMemory";
import { statisticalValidator } from "@/lib/anti-spam/statististical-validator";
import { report } from "process";

export default function CoursePage() {
  const [course, setCourse] = useState<any>(null);

  const [user, setUser] = useState<any>(null);

  const [currentExercise, setCurrentExercise] = useState(0);

  const [tab, setTab] = useState<"practice" | "theory" | "errors">("practice");

  const [title, setTitle] = useState("Course");

  const [daily, setDaily] = useState<any>({
    progress: 0,
    goal: 5,
    completed: false,
  });

  const [streak, setStreak] = useState(0);

  const [downloadInfo, setDownloadInfo] = useState({ text: "", model: "" });
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  /* =====================================================
     STREAMING STATES
  ===================================================== */

  const [streamedExplanation, setStreamedExplanation] = useState("");

  const [streamedExercises, setStreamedExercises] = useState<any[]>([]);

  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false);

  const [isGeneratingExercises, setIsGeneratingExercises] = useState(false);

  const [streamProgress, setStreamProgress] = useState(0);

  const [loadingCourse, setLoadingCourse] = useState(true);

  useEffect(() => {
    load();
  }, []);

  // Libera a memória RAM/GPU do WebLLM assim que o componente é desmontado (mudança de rota/página)
  useEffect(() => {
    return () => {
      unloadEngine().catch((err) =>
        console.error("[COURSE UNLOAD ERROR]", err),
      );
    };
  }, []);

  /* =====================================================
     LOAD
  ===================================================== */

  async function load() {
    setLoadingCourse(true);

    const userData = await getUser();

    setUser(userData);

    const activeCourseId = userData?.activeCourse;

    setStreak(userData?.streak || 0);

    const dailyData = await db.daily.get("daily_main");

    if (dailyData) {
      setDaily(dailyData);
    }

    if (!activeCourseId) {
      setLoadingCourse(false);
      return;
    }

    const found = await db.courses.get(activeCourseId);

    if (!found) {
      setLoadingCourse(false);
      return;
    }

    setCourse(found);

    setCurrentExercise(found.currentExercise || 0);

    setTitle(found.topic || found.title || "Course");

    /* ============================================
       STREAM GENERATION
    ============================================ */

    await initEngine(undefined, (report) => {
      setDownloadInfo({
        text: report.text,
        model: "Neural Engine v1.0",
      });
    });

    await startStreamingLesson(found);

    setLoadingCourse(false);
  }

  /* =====================================================
     STREAM LESSON
  ===================================================== */

  async function startStreamingLesson(currentCourse: any) {
    try {
      setStreamedExplanation("");

      setStreamedExercises([]);

      setIsGeneratingExplanation(true);

      setIsGeneratingExercises(true);

      setStreamProgress(0);

      /* ====================================
         STREAM LESSON
      ==================================== */

      const streamed = await streamLesson({
        course: currentCourse,

        concept: currentCourse.topic || currentCourse.title,

        difficulty: currentCourse.difficulty || 1,

        exerciseCount: 3,

        onExercise(exercise, index) {
          setStreamedExercises((prev) => [...prev, exercise]);

          setStreamProgress(40 + (index + 1) * 20);
        },
      });

      /* ====================================
         THEORY EXPLANATION AI
      ==================================== */

      const explanationStream = await generateExplanationAI({
        lesson: streamed,
        history: currentCourse.lessons || [],
        user,
        course: currentCourse,
      });

      // Se for um stream (AsyncIterable), consumimos pedaço por pedaço
      if (
        explanationStream &&
        typeof explanationStream === "object" &&
        Symbol.asyncIterator in explanationStream
      ) {
        let fullText = "";
        for await (const chunk of explanationStream as any) {
          const content = chunk.choices?.[0]?.delta?.content || "";
          fullText += content;
          setStreamedExplanation(fullText); // Atualiza a UI conforme as palavras chegam
        }
      } else {
        // Caso a função retorne uma string simples (fallback)
        setStreamedExplanation(
          (explanationStream as unknown as string) || streamed.explanation,
        );
      }

      // --- ADICIONE ESTAS LINHAS PARA FECHAR O BLOCO ---
      setIsGeneratingExplanation(false);
      setIsGeneratingExercises(false);
    } catch (error) {
      console.error("Erro no stream:", error);
      // Incrementa erros se a IA falhar em gerar (mitiga loop infinito)
      setConsecutiveErrors((prev) => prev + 1);
      setIsGeneratingExplanation(false);
      setIsGeneratingExercises(false);

      if (consecutiveErrors >= 2) {
        alert(
          "📡 LINK NEURAL INSTÁVEL: O motor de IA falhou. Recarregando módulos...",
        );
        window.location.reload();
      }
    }
  } // <--- CORREÇÃO CRÍTICA: Adicione esta chave para fechar a função startStreamingLesson!

  /* =====================================================
      NEXT (Agora movido corretamente para o escopo do componente principal)
  ===================================================== */

  // AJUSTE: Adicionado o terceiro parâmetro 'xpGainFromExercise' vindo do renderer
  async function handleNext(
    correct: boolean,
    userResponse?: string,
    xpGainFromExercise?: number,
  ) {
    if (!course) return;

    /* ====================================
        ANTI-SPAM VALIDATION
    ==================================== */
    if (userResponse) {
      // Importante: certifique-se que o import statisticalValidator existe
      const isSpam = statisticalValidator.isLowEntropy(userResponse);
      if (isSpam) {
        alert(
          "⚠️ NEURAL_ERROR: Resposta inconsistente detectada. Tente elaborar melhor.",
        );
        return; // Interrompe a execução antes de processar XP ou erros
      }
    }

    const exercise = streamedExercises[currentExercise];

    /* ====================================
        MEMORY
    ==================================== */
    await updateMemory({
      topic: course.topic || course.title,
      correct,
      type: "exercise",
      input: exercise?.question || "",
    });

    /* ====================================
        XP & PROGRESSION
    ==================================== */
    /* ====================================
          XP & PROGRESSION
      ==================================== */
    // ADICIONADO: Importações automáticas do ecossistema Code-Ascension
    const { updateMastery, updateConfidence } =
      await import("@/lib/curriculumState");
    const { addXP, addCoins } = await import("@/lib/economy");
    const { saveMemorySummary, shouldUpdateSummary } =
      await import("@/lib/contextMemory");

    if (correct) {
      // Reset do contador Roguelike se acertar
      setConsecutiveErrors(0);

      const xpGain = xpGainFromExercise ?? 10;
      setStreak((prev) => prev + 1);

      // ALTERADO: Agora usa as curvas reais do economy.ts (com sons e leveis automáticos)
      await addXP(xpGain);
      await addCoins(2);

      // ADICIONADO: Sincroniza o progresso no grafo curricular do usuário (+10 de maestria e +5 de confiança)
      if (course?.id && exercise?.topic) {
        await updateMastery(course.id, exercise.topic, 10);
        await updateConfidence(course.id, exercise.topic, 5);
      }

      // ADICIONADO: Integração Anti-Spam / Compressão de Memória Periódica
      const currentLessonCount = (course?.lessons?.length || 0) + 1;
      if (shouldUpdateSummary(currentLessonCount) && course?.id) {
        const freshUserMemory = await db.user.get("main");
        await saveMemorySummary(course.id, {
          lessons: course.lessons || [],
          memory: freshUserMemory,
          mastery: freshUserMemory?.mastery || 0,
        });
      }

      /* ================================
          CLEAR ERROR LOGS
      ================================ */
      const errors = await getErrorLogs(course.id);
      const matching = errors.find(
        (e: any) => e.question === exercise.question,
      );

      if (matching && matching.id !== undefined) {
        await clearErrorLog(matching.id);
      }
    } else {
      // ADICIONADO: Penaliza confiança e resgata o nó no grafo curricular devido ao erro
      if (course?.id && exercise?.topic) {
        await updateConfidence(course.id, exercise.topic, -8);
      }
      /* ====================================
          ROGUELIKE REDIRECT (3 ERRORS)
      ==================================== */
      const newErrorCount = consecutiveErrors + 1;
      setConsecutiveErrors(newErrorCount);

      if (newErrorCount >= 3) {
        setConsecutiveErrors(0); // Reseta para a próxima tentativa
        setTab("theory"); // Muda para a aba de teoria
        alert(
          "🧠 NEURAL GLITCH: Muitas falhas consecutivas. Revise o feed de teoria antes de continuar.",
        );
        return; // Sai da função sem gerar mais reforço agora
      }

      /* ================================
          REINFORCEMENT
      ================================= */
      const reinforcement = await generateReinforcement(
        {
          ...exercise,
          difficulty: 0.6,
        },
        course,
      );

      setStreamedExercises((prev) => {
        const clone = [...prev];
        const reinforcementCount = clone.filter(
          (e) => e.isReinforcement,
        ).length;

        if (reinforcementCount < 5) {
          clone.splice(currentExercise + 1, 0, {
            ...reinforcement,
            isReinforcement: true,
          });
        }
        return clone;
      });
    }

    /* ====================================
        NEXT EXERCISE
    ==================================== */
    const next = currentExercise + 1;

    if (next >= streamedExercises.length) {
      await startStreamingLesson(course);
      setCurrentExercise(0);
      return;
    }

    setCurrentExercise(next);

    const freshUser = await getUser();
    setUser(freshUser);
  }

  /* =====================================================
     LOADING
  ===================================================== */

  // Substitua a verificação de loadingCourse por:
  if (loadingCourse) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black text-cyan-400 font-mono">
        <div className="relative w-64 h-2 bg-slate-900 border border-cyan-900/30 mb-4 overflow-hidden">
          <div
            className="absolute inset-0 bg-cyan-500 animate-pulse-fast"
            style={{
              width: downloadInfo.text.includes("%")
                ? downloadInfo.text.split("%")[0].split("[")[1] + "%"
                : "10%",
            }}
          />
        </div>
        <div className="text-[10px] uppercase tracking-[0.2em] animate-pulse">
          {downloadInfo.text || "Initializing Core..."}
        </div>
        <div className="mt-2 text-[8px] text-cyan-900">
          SYSTEM_READY: WAITING_FOR_GPU_ALLOCATION
        </div>
      </div>
    );
  }

  if (!course) {
    return <div className="p-6">Course not found.</div>;
  }

  const currentStreamExercise = streamedExercises[currentExercise];

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
          <span className="text-orange-400">🔥 {streak}</span>

          <span className="text-yellow-400">
            🎯 {daily.progress || 0}/{daily.goal || 5}
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
        <p>[{isGeneratingExplanation ? "..." : "✓"}] explanation</p>

        <p>[{isGeneratingExercises ? "..." : "✓"}] exercises</p>
      </div>

      {/* TABS */}

      <div className="flex gap-2 mb-5">
        {["practice", "theory", "errors"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={`flex-1 p-2 rounded-xl capitalize transition-all ${
              tab === t ? "bg-cyan-600" : "bg-slate-800"
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
            <div className="p-5 text-sm opacity-60">Generating exercise...</div>
          ) : (
            <ExerciseRenderer
              rawExercise={currentStreamExercise}
              onNext={handleNext}
              course={course}
              isStreaming={isGeneratingExercises}
              streamProgress={streamProgress}
            />
          )}
        </>
      )}

      {/* THEORY */}

      {tab === "theory" && (
        <div className="bg-slate-900 border border-cyan-900/40 p-5 rounded-2xl">
          <h2 className="text-cyan-400 font-bold mb-3">Neural Theory Feed</h2>

          {isGeneratingExplanation && !streamedExplanation ? (
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

      {tab === "errors" && <ErrorsTab course={course} />}
    </div>
  );
}

/* =========================================================
   ERRORS TAB
========================================================= */

function ErrorsTab({ course }: { course: any }) {
  const [errors, setErrors] = useState<any[]>([]);

  const [aiExplanations, setAiExplanations] = useState<Record<number, string>>(
    {},
  );

  useEffect(() => {
    async function loadErrors() {
      const e = await getErrorLogs(course.id);

      const last = e.slice(-5);

      setErrors(last);

      const results: string[] = [];

      // Localize este bloco dentro da função loadErrors:
      for (const err of last) {
        try {
          const explanation = await explainError({
            ...err,
            course,
          });
          results.push(
            typeof explanation === "string"
              ? explanation
              : "Explanation processing...",
          );
        } catch {
          results.push("Failed to explain.");
        }
      }

      const map: Record<number, string> = {};

      results.forEach((res, i) => {
        map[i] = res ?? "";
      });

      setAiExplanations(map);
    }

    loadErrors();
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

          <p className="text-green-400 text-xs">✔ {err.correct}</p>

          {aiExplanations[i] && (
            <p className="text-cyan-300 text-xs mt-3 whitespace-pre-wrap">
              🧠 {aiExplanations[i]}
            </p>
          )}
        </div>
      ))}

      {errors.length === 0 && (
        <div className="p-6 border border-dashed border-slate-700 rounded-xl text-center opacity-50">
          No critical failures detected.
        </div>
      )}
    </div>
  );
}
