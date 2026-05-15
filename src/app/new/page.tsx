"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { get, save } from "@/lib/db";
import { generate } from "@/lib/webllm";
import { buildCoursePrompt } from "@/lib/aiPrompt";
import { suggestDifficulty } from "@/lib/learningState";
import { playSound } from "@/lib/sounds";
import { gibberishDetector } from "@/lib/anti-spam/gibberish-detector";

import {
  Terminal,
  Cpu,
  Zap,
  BrainCircuit,
  Sparkles,
  AlertTriangle,
  ChevronLeft,
  Loader2
} from "lucide-react";

export default function NewCoursePage() {
  const router = useRouter();

  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [cognitiveProfile, setCognitiveProfile] = useState<string>("Standard");

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

    if (gibberishDetector.isTotalGibberish(topic, 'promptTheme')) {
      setStatus("INPUT_REJECTED: NEURAL_NOISE_DETECTED");
      playSound("error", 0.5);
      return;
    }

    setLoading(true);
    setStatus("INITIALIZING_NEURAL_LINK...");
    setProgress(10);
    playSound("click", 0.3);

    try {
      const difficulty = await suggestDifficulty(topic, cognitiveProfile);
      setProgress(25);
      setStatus("ANALYZING_COGNITIVE_MAP...");

      const courseId = `course_${Date.now()}`;
      const userProfile = cognitiveProfile; 
      const learningStateString = `Level: ${user?.xp || 0}, Cognitive: ${userProfile}`;

      const fullPrompt = await buildCoursePrompt(
        topic,
        learningStateString,
        courseId,
        userProfile
      );

      setProgress(40);
      setStatus("FORGING_CURRICULUM_DATA...");

      const generator = generate(fullPrompt);
      let cleanContent = "";

      for await (const chunk of generator) {
        cleanContent += chunk;
        setStatus(`DOWNLOADING_NEURAL_DATA... [${cleanContent.length} bytes]`);
      }

      if (!cleanContent) throw new Error("EMPTY_AI_RESPONSE");

      setProgress(80);
      setStatus("STABILIZING_ENCRYPTION...");

      const courseData = JSON.parse(cleanContent);

      const newCourse = {
        id: courseId,
        topic,
        difficulty,
        lessons: courseData.lessons || [],
        createdAt: Date.now(),
        status: "active"
      };

      await save("courses", newCourse, courseId);
      await save("user", { ...user, activeCourse: topic }, "main");

      setProgress(100);
      setStatus("SYNC_COMPLETE");
      playSound("success", 0.5);

      setTimeout(() => {
        router.push(`/course/${courseId}`);
      }, 800);

    } catch (err) {
      console.error("Forge Error:", err);
      setStatus("LINK_CRITICAL_FAILURE");
      playSound("error", 0.5);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 pb-32 font-mono">
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
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">Neural_Forge</h1>
        </div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">
          Procedural content generation via Local LLM Core
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleForge} className="space-y-8">
          <div className="relative group">
            <div className={`absolute -inset-1 bg-linear-to-r ${status.includes('REJECTED') ? 'from-red-500 to-orange-600' : 'from-cyan-500 to-purple-600'} rounded-xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000`}></div>
            <div className="relative bg-slate-900 rounded-xl border border-slate-800 p-2">
              <input
                type="text"
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  if (status.includes('REJECTED')) setStatus("");
                }}
                placeholder="INPUT_LEARNING_TOPIC_HERE..."
                className="w-full bg-transparent p-4 outline-none text-cyan-50 font-bold placeholder:text-slate-700 text-lg"
                disabled={loading}
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-6 p-8 bg-slate-900/50 rounded-2xl border border-slate-800 animate-in fade-in zoom-in duration-500">
              <div className="flex justify-between items-end mb-2">
                <div className="space-y-1">
                  <span className="block text-[10px] text-slate-500 font-bold">SYSTEM_STATUS</span>
                  <span className="block text-cyan-400 text-xs font-black tracking-widest animate-pulse">{status}</span>
                </div>
                <span className="text-2xl font-black text-slate-700">{progress}%</span>
              </div>

              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  className="h-full bg-linear-to-r from-cyan-600 via-blue-500 to-purple-600 rounded-full transition-all duration-700 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex items-start gap-3 p-4 bg-slate-950/50 rounded border border-slate-800/50">
                <Loader2 size={16} className="text-cyan-500 animate-spin mt-0.5" />
                <p className="text-[9px] text-slate-500 leading-relaxed uppercase">
                  Notice: The Neural Engine is executing a heavy VRAM operation on your local GPU.
                  Closing this uplink will corrupt the forge sequence.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {status.includes('REJECTED') && (
                <div className="text-red-500 text-[10px] font-black uppercase flex items-center gap-2 mb-2">
                  <AlertTriangle size={12} />
                  {status}
                </div>
              )}
              <button
                type="submit"
                className="group relative w-full overflow-hidden p-0.5 rounded-xl transition-transform active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-linear-to-r from-cyan-500 via-purple-500 to-blue-500 animate-gradient-x" />
                <div className="relative bg-slate-950 rounded-[10px] p-5 flex items-center justify-center gap-3 group-hover:bg-transparent transition-colors">
                  <Sparkles size={20} className="text-cyan-400 group-hover:text-slate-950" />
                  <span className="text-slate-100 font-black uppercase tracking-tighter group-hover:text-slate-950">
                    Begin Sequential Forge
                  </span>
                </div>
              </button>
            </div>
          )}
        </form>

        {!loading && (
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm focus-within:border-fuchsia-500 transition-colors duration-300">
              <div className="flex items-center gap-2 text-purple-400 mb-3">
                <Zap size={16} fill="currentColor" />
                <span className="text-[11px] font-black uppercase tracking-tighter">Cognitive_Shield</span>
              </div>
              <div className="relative">
                <select
                  value={cognitiveProfile}
                  onChange={(e) => setCognitiveProfile(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 font-bold text-xl py-1 px-2 rounded-lg border border-slate-800 outline-none focus:border-fuchsia-500 cursor-pointer appearance-none tracking-tight uppercase"
                  disabled={loading}
                >
                  <option value="Standard">Standard</option>
                  <option value="tdah">TDAH</option>
                  <option value="Deep_Dive">Deep_Dive</option>
                  <option value="Visual_Logic">Visual_Logic</option>
                </select>
              </div>
              <div className="h-1 w-12 bg-purple-500/30 my-2" />
              <p className="text-[10px] text-slate-500 leading-normal uppercase">
                Curriculum density automatically calibrated for your neural profile.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-cyan-400 mb-3">
                <Cpu size={16} />
                <span className="text-[11px] font-black uppercase tracking-tighter">Hardware_Status</span>
              </div>
              <p className="text-xl font-bold text-slate-200">Local_WebGPU</p>
              <div className="h-1 w-12 bg-cyan-500/30 my-2" />
              <p className="text-[10px] text-slate-500 leading-normal uppercase">
                Zero data exfiltration. All processing happens in device sandbox.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
