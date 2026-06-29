"use client";

import {
  getWeakTopics,
  getSuggestedTopics,
} from "@/lib/others/curriculumState";
import { getReviewConcepts } from "@/lib/others/mastery";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { get, save } from "@/lib/others/db";
import { generate } from "@/lib/others/webllm";
import { buildCoursePrompt } from "@/lib/others/aiPrompt";
import { suggestDifficulty } from "@/lib/others/learningState";
import { playSound } from "@/lib/others/sounds";
import { gibberishDetector } from "@/lib/anti-spam/gibberish-detector";
import { CognitiveProfile } from "@/types/core";
import CourseForgeProgress from "@/components/course/CourseForgeProgress";
import { validateCourse } from "src/lib/others/courseValidator";
import { generateCourse } from "src/lib/others/courseGenerator";

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
  const [generatedChars, setGeneratedChars] = useState(0);
  const [forgeStartedAt, setForgeStartedAt] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [cognitiveProfile, setCognitiveProfile] =
    useState<CognitiveProfile>("Standard");
  const [customStyle, setCustomStyle] = useState("");
  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

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

  const abortController = new AbortController();
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
    setForgeStartedAt(Date.now());
    setGeneratedChars(0);

    setStatus("INITIALIZING_NEURAL_LINK...");
    setProgress(10);

    playSound("click", 0.3);

    try {
      const difficulty = await suggestDifficulty(topic, cognitiveProfile);

      setProgress(25);

      setStatus("ANALYZING_COGNITIVE_MAP...");

      const courseId = `course_${Date.now()}`;

      const courseId = `course_${Date.now()}`;

      const courseData = await generateCourse({
        topic,
        difficulty,
        cognitive: cognitiveProfile,
        courseId,
        customStyle,
      });

      let cleanContent = "";

      for await (const chunk of generator) {
        // 🧠 evita update depois de desmontar componente
        if (!isMounted.current) {
          abortController.abort();
          break;
        }

        cleanContent += chunk;
        setGeneratedChars(cleanContent.length);

        // =====================================================
        // HARD SAFETY LIMIT
        // =====================================================

        if (cleanContent.length >= hardMaxChars) {
          throw new Error("MAX_OUTPUT_LIMIT_REACHED");
        }

        // =====================================================
        // AUTO STOP IF JSON COMPLETED
        // =====================================================

        const trimmed = cleanContent.trim();

        const jsonLooksComplete =
          trimmed.endsWith("}") &&
          (trimmed.includes('"modules"') || trimmed.includes('"lessons"'));

        if (jsonLooksComplete) {
          break;
        }

        // =====================================================
        // PROGRESS CALCULATION
        // =====================================================

        const targetProgress = Math.min(
          78,
          40 + (cleanContent.length / estimatedMaxChars) * 38,
        );

        simulatedProgress += (targetProgress - simulatedProgress) * 0.15;

        const uiProgress = Math.floor(simulatedProgress);

        if (isMounted.current) {
          setProgress(uiProgress);
          setStatus(
            `DOWNLOADING_NEURAL_DATA... [${uiProgress}% | ${cleanContent.length} chars]`,
          );
        }
      }

      if (
    !cleanContent.includes('"modules"') &&
    !cleanContent.includes('"lessons"')
) {
    console.error("===== RAW RESPONSE =====");
    console.error(cleanContent);
    console.error("========================");

    throw new Error("INVALID_COURSE_SCHEMA");
}
      if (
        !cleanContent.includes('"modules"') &&
        !cleanContent.includes('"lessons"')
      ) {
        throw new Error("INVALID_COURSE_SCHEMA");
      }
      setProgress(85);

      setStatus("PARSING_CURRICULUM_MATRIX...");

      // 🔥 remove markdown fence caso IA devolva ```json
      const sanitized = cleanContent
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      let courseData;

      try {
        courseData = JSON.parse(sanitized);
      } catch (e) {
        console.error("[RAW AI OUTPUT]", cleanContent);

        throw new Error("JSON_PARSE_FAILED");
      }
      console.log("[RAW COURSE RESPONSE]");
      console.log(courseData);
      if (!courseData.modules && !courseData.lessons) {
        throw new Error("INVALID_COURSE_SCHEMA");
      }
      setProgress(92);

      setStatus("STABILIZING_ENCRYPTION...");

      const newCourse = {
        id: courseId,
        topic,

        title: courseData.title || topic,

        description: courseData.description || "",

        difficulty,

        tags: courseData.tags || [],

        modules: courseData.modules || [],

        lessons: courseData.lessons || [],

        createdAt: Date.now(),

        status: "active",
      };
      console.log("[FORGE COURSE]", JSON.stringify(newCourse, null, 2));
      await save("courses", newCourse, courseId);

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
        router.push(`/course/${courseId}`);
      }, 1000);
    } catch (err) {
      console.error("Forge Error:", err);

      abortController.abort();

      if (isMounted.current) {
        setStatus("LINK_CRITICAL_FAILURE");
        setLoading(false);
      }

      setTimeout(() => {
        if (isMounted.current) {
          setIsForging(false);
        }
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
          <BrainCircuit size={32} className="animate-pulse" />

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
        <form onSubmit={handleForge} className="space-y-8">
          {/* ========================================================= */}
          {/* TOPIC INPUT */}
          {/* ========================================================= */}

          <div className="relative group">
            <div
              className={`absolute -inset-1 bg-linear-to-r ${
                status.includes("REJECTED")
                  ? "from-red-500 to-orange-600"
                  : "from-cyan-500 to-purple-600"
              } rounded-xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000`}
            />

            <div className="relative bg-slate-900 rounded-xl border border-slate-800 p-2">
              <input
                type="text"
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);

                  if (status.includes("REJECTED")) {
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
            <CourseForgeProgress
              progress={progress}
              status={status}
              generatedChars={generatedChars}
              estimatedChars={35000}
              startedAt={forgeStartedAt}
            />
          ) : (
            <div className="space-y-4">
              {status.includes("REJECTED") && (
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

        {/* ========================================================= */}
        {/* CUSTOM STYLE */}
        {/* ========================================================= */}

        <div className="mt-8 p-5 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm focus-within:border-[#00f0ff] transition-colors duration-300">
          <div className="flex items-center gap-2 text-[#00f0ff] mb-3">
            <Sparkles size={16} />

            <span className="text-[11px] font-black uppercase tracking-tighter">
              Custom_Neural_Directive
            </span>
          </div>

          <textarea
            value={customStyle}
            onChange={(e) => setCustomStyle(e.target.value)}
            placeholder="EX: Explique usando metáforas de Star Wars..."
            className="w-full h-20 bg-slate-950 text-slate-200 font-bold text-sm py-2 px-3 rounded-lg border border-slate-800 outline-none focus:border-[#00f0ff] placeholder:text-slate-700 tracking-tight transition-colors resize-none uppercase"
            disabled={loading}
          />

          <div className="h-1 w-12 bg-cyan-500/30 my-2" />

          <p className="text-[10px] text-slate-500 leading-normal uppercase">
            Injeta modificadores diretos na personalidade e didática da IA.
          </p>
        </div>

        {/* ========================================================= */}
        {/* GRID */}
        {/* ========================================================= */}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* COGNITIVE */}

          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-[#00f0ff] mb-3">
              <Zap size={16} fill="currentColor" />

              <span className="text-[11px] font-black uppercase tracking-tighter">
                Cognitive_Shield
              </span>
            </div>

            <select
              value={cognitiveProfile}
              onChange={(e) =>
                setCognitiveProfile(e.target.value as CognitiveProfile)
              }
              className="w-full bg-slate-950 text-slate-200 font-bold text-xl py-1 px-2 rounded-lg border border-slate-800 outline-none focus:border-[#ff0055] cursor-pointer appearance-none tracking-tight uppercase transition-colors"
              disabled={loading}
            >
              <option value="Standard">Standard</option>

              <option value="tdah">TDAH</option>

              <option value="Deep_Dive">Deep_Dive</option>

              <option value="Visual_Logic">Visual_Logic</option>
            </select>

            <div className="h-1 w-12 bg-purple-500/30 my-2" />

            <p className="text-[10px] text-slate-500 leading-normal uppercase">
              Curriculum density calibrated for your neural profile.
            </p>
          </div>

          {/* HARDWARE */}

          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-cyan-400 mb-3">
              <Cpu size={16} />

              <span className="text-[11px] font-black uppercase tracking-tighter">
                Hardware_Status
              </span>
            </div>

            <p className="text-xl font-bold text-slate-200">Local_WebGPU</p>

            <div className="h-1 w-12 bg-cyan-500/30 my-2" />

            <p className="text-[10px] text-slate-500 leading-normal uppercase">
              Zero data exfiltration. All processing happens inside device
              sandbox.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
