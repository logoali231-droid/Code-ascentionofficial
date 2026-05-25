"use client";

import { getWeakTopics, getSuggestedTopics } from "@/lib/others/curriculumState";
import { getReviewConcepts } from "@/lib/others/mastery";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { get, save } from "@/lib/others/db";
import { generate } from "@/lib/others/webllm";
import { buildCoursePrompt } from "@/lib/others/aiPrompt";
import { suggestDifficulty } from "@/lib/others/learningState";
import { playSound } from "@/lib/others/sounds";
import { gibberishDetector } from "@/lib/anti-spam/gibberish-detector";
import { CognitiveProfile } from "@/types/core";

import {
  Cpu,
  Zap,
  BrainCircuit,
  Sparkles,
  AlertTriangle,
  ChevronLeft,
  Loader2,
} from "lucide-react";

import { calculateLevel } from "@/lib/others/level";

export default function NewCoursePage() {
  const router = useRouter();

  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [isForging, setIsForging] = useState(false);

  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);

  const [user, setUser] = useState<any>(null);

  const [cognitiveProfile, setCognitiveProfile] =
    useState<CognitiveProfile>("Standard");

  const [customStyle, setCustomStyle] = useState("");

  useEffect(() => {
    async function loadUser() {
      const userData = await get("user", "main");

      setUser(userData);

      if (userData?.cognitive) {
        setCognitiveProfile(userData.cognitive);
      }
    }

    loadUser();
  }, []);

  const handleForge = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!topic.trim() || loading) return;

    if (gibberishDetector.isTotalGibberish(topic, "promptTheme")) {
      setStatus("INPUT_REJECTED: NEURAL_NOISE_DETECTED");

      playSound("error", 0.5);

      return;
    }

    setLoading(true);
    setIsForging(true);

    setStatus("INITIALIZING_NEURAL_LINK...");
    setProgress(10);

    playSound("click", 0.3);

    try {
      const difficulty = await suggestDifficulty(
        topic,
        cognitiveProfile,
      );

      setProgress(25);

      setStatus("ANALYZING_COGNITIVE_MAP...");

      const courseId = `course_${Date.now()}`;

      const realLevel = calculateLevel(user?.xp || 0);

      const userProfile = cognitiveProfile;

      // =========================================================
      // ADAPTIVE LEARNING STATE
      // =========================================================

      const currentCourseId =
        user?.activeCourse || "main";

      const weakTopics =
        await getWeakTopics(currentCourseId);

      await getSuggestedTopics(currentCourseId);

      const spacedRepetitionTargets =
        await getReviewConcepts(3);

      const weakTopicsStr =
        weakTopics
          .map((t) => t.topic)
          .slice(0, 3)
          .join(", ") || "None detected";

      const reviewStr =
        spacedRepetitionTargets
          .map((c) => c.conceptId)
          .join(", ") || "None pending";

      const learningStateString = `
Level: ${realLevel},
Cognitive: ${userProfile},
Critical Weaknesses: [${weakTopicsStr}],
Spaced Repetition Targets: [${reviewStr}]
`;

      const fullPrompt =
        await buildCoursePrompt(
          topic,
          learningStateString,
          courseId,
          userProfile,
          customStyle,
          cognitiveProfile,
        );

      // =========================================================
      // AI GENERATION
      // =========================================================

      setProgress(40);

      setStatus("FORGING_CURRICULUM_DATA...");

      const generator = generate(fullPrompt);

      let cleanContent = "";

      // 🔥 evita loop infinito silencioso
      const MAX_CHARS = 45000;

      // 🔥 fallback de timeout
      const generationStart = Date.now();

      for await (const chunk of generator) {
        cleanContent += chunk;

        // =====================================================
        // HARD LIMIT
        // =====================================================

        if (cleanContent.length >= MAX_CHARS) {
          console.warn(
            "MAX_CHARS_REACHED: forcing stop",
          );

          break;
        }

        // =====================================================
        // TIMEOUT
        // =====================================================

        if (
          Date.now() - generationStart >
          1000 * 60
        ) {
          throw new Error(
            "GENERATION_TIMEOUT",
          );
        }

        // =====================================================
        // SMART PROGRESS
        // =====================================================

        const generationRatio =
          cleanContent.length / MAX_CHARS;

        const calculatedProgress =
          Math.min(
            78,
            40 + generationRatio * 38,
          );

        setProgress(
          Math.floor(calculatedProgress),
        );

        setStatus(
          `DOWNLOADING_NEURAL_DATA... [${Math.floor(
            generationRatio * 100,
          )}%]`,
        );

        // =====================================================
        // EARLY JSON DETECTION
        // =====================================================

        const trimmed =
          cleanContent.trim();

        if (
          trimmed.endsWith("}") &&
          trimmed.includes('"lessons"')
        ) {
          try {
            JSON.parse(
              trimmed
                .replace(/```json/g, "")
                .replace(/```/g, "")
                .trim(),
            );

            console.log(
              "VALID_JSON_DETECTED",
            );

            break;
          } catch {
            // ainda incompleto
          }
        }
      }

      if (!cleanContent) {
        throw new Error("EMPTY_AI_RESPONSE");
      }

      setProgress(85);

      setStatus(
        "PARSING_CURRICULUM_MATRIX...",
      );

      // =========================================================
      // SANITIZE
      // =========================================================

      const sanitized = cleanContent
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      // =========================================================
      // PARSE
      // =========================================================

      let courseData;

      try {
        courseData = JSON.parse(sanitized);
      } catch (parseErr) {
        console.error(
          "INVALID_JSON:",
          sanitized,
        );

        throw new Error(
          "CURRICULUM_MATRIX_CORRUPTED",
        );
      }

      setProgress(92);

      setStatus(
        "STABILIZING_ENCRYPTION...",
      );

      const newCourse = {
        id: courseId,
        topic,
        difficulty,
        lessons:
          courseData.lessons || [],
        createdAt: Date.now(),
        status: "active",
      };

      await save(
        "courses",
        newCourse,
        courseId,
      );

      await save(
        "user",
        {
          ...user,
          activeCourse: courseId,
        },
        "main",
      );

      setProgress(100);

      setStatus("SYNC_COMPLETE");

      playSound("success", 0.5);

      setTimeout(() => {
        router.push(
          `/course/${courseId}`,
        );
      }, 1000);

    } catch (err) {
      console.error(
        "Forge Error:",
        err,
      );

      if (
        err instanceof Error &&
        err.message ===
          "GENERATION_TIMEOUT"
      ) {
        setStatus(
          "GENERATION_TIMEOUT_DETECTED",
        );
      } else if (
        err instanceof Error &&
        err.message ===
          "CURRICULUM_MATRIX_CORRUPTED"
      ) {
        setStatus(
          "INVALID_AI_RESPONSE_STRUCTURE",
        );
      } else {
        setStatus(
          "LINK_CRITICAL_FAILURE",
        );
      }

      playSound("error", 0.5);

      setLoading(false);

      setTimeout(() => {
        setIsForging(false);
      }, 1200);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 pb-32 font-mono">
      {/* ========================================================= */}
      {/* HEADER */}
      {/* ========================================================= */}

      <div className="max-w-2xl mx-auto mb-8 border-b border-slate-800 pb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-500 hover:text-cyan-400 transition-colors mb-6 text-xs uppercase font-bold"
        >
          <ChevronLeft size={14} />
          Return to Hub
        </button>

        <div className="flex items-center gap-3 text-cyan-500 mb-2">
          <BrainCircuit
            size={32}
            className="animate-pulse"
          />

          <h1 className="text-3xl font-black tracking-tighter uppercase italic">
            Neural_Forge
          </h1>
        </div>

        <p className="text-[10px] text-slate-500 uppercase tracking-widest">
          Procedural content generation via Local LLM Core
        </p>
      </div>

      {/* ========================================================= */}
      {/* MAIN */}
      {/* ========================================================= */}

      <div className="max-w-2xl mx-auto">
        <form
          onSubmit={handleForge}
          className="space-y-8"
        >
          {/* ========================================================= */}
          {/* TOPIC INPUT */}
          {/* ========================================================= */}

          <div className="relative group">
            <div
              className={`absolute -inset-1 bg-linear-to-r ${
                status.includes(
                  "REJECTED",
                )
                  ? "from-red-500 to-orange-600"
                  : "from-cyan-500 to-purple-600"
              } rounded-xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000`}
            />

            <div className="relative bg-slate-900 rounded-xl border border-slate-800 p-2">
              <input
                type="text"
                value={topic}
                onChange={(e) => {
                  setTopic(
                    e.target.value,
                  );

                  if (
                    status.includes(
                      "REJECTED",
                    )
                  ) {
                    setStatus("");
                  }
                }}
                placeholder="INPUT_LEARNING_TOPIC_HERE..."
                className="w-full bg-transparent p-4 outline-none text-cyan-50 font-bold placeholder:text-slate-700 text-lg"
                disabled={loading}
              />
            </div>
          </div>

          {/* ========================================================= */}
          {/* FORGE STATUS */}
          {/* ========================================================= */}

          {isForging ? (
            <div className="space-y-6 p-8 bg-slate-900/50 rounded-2xl border border-slate-800 animate-in fade-in zoom-in duration-500">
              <div className="flex justify-between items-end mb-2">
                <div className="space-y-1">
                  <span className="block text-[10px] text-slate-500 font-bold">
                    SYSTEM_STATUS
                  </span>

                  <span className="block text-cyan-400 text-xs font-black tracking-widest animate-pulse">
                    {status}
                  </span>
                </div>

                <span className="text-2xl font-black text-slate-700 tabular-nums">
                  {Math.floor(
                    progress,
                  )}
                  %
                </span>
              </div>

              {/* PROGRESS BAR */}

              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  className="h-full bg-linear-to-r from-cyan-600 via-blue-500 to-purple-600 rounded-full transition-all duration-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              {/* INFO BOX */}

              <div className="flex items-start gap-3 p-4 bg-slate-950/50 rounded border border-slate-800/50">
                <Loader2
                  size={16}
                  className="text-cyan-500 animate-spin mt-0.5 shrink-0"
                />

                <p className="text-[9px] text-slate-500 leading-relaxed uppercase">
                  Notice: The Neural Engine is executing a heavy VRAM operation
                  on your local GPU. Closing this uplink may corrupt the forge
                  sequence.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {status.includes(
                "REJECTED",
              ) && (
                <div className="text-red-500 text-[10px] font-black uppercase flex items-center gap-2 mb-2">
                  <AlertTriangle size={12} />
                  {status}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden p-0.5 rounded-xl transition-transform active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-linear-to-r from-cyan-500 via-purple-500 to-blue-500 animate-gradient-x" />

                <div className="relative bg-slate-950 rounded-[10px] p-5 flex items-center justify-center gap-3 group-hover:bg-transparent transition-colors">
                  <Sparkles
                    size={20}
                    className="text-cyan-400 group-hover:text-slate-950"
                  />

                  <span className="text-slate-100 font-black uppercase tracking-tighter group-hover:text-slate-950">
                    Begin Sequential Forge
                  </span>
                </div>
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}