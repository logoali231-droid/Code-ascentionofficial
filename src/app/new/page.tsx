"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { get, save } from "@/lib/db";
import { generateSafe } from "@/lib/webllm";
import { buildCoursePrompt } from "@/lib/aiPrompt";
import { suggestDifficulty } from "@/lib/learningState";
import { playSound } from "@/lib/sounds";
import { Terminal, Cpu, Zap, BrainCircuit, Sparkles, AlertTriangle } from "lucide-react";

export default function NewCoursePage() {
  const router = useRouter();
  
  // Estado do Formulário
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  
  // Estado do Usuário para Adaptação
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function loadUser() {
      const userData = await get("user", "main");
      setUser(userData);
    }
    loadUser();
  }, []);

  const handleForge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || loading) return;

    setLoading(true);
    setStatus("INITIALIZING_NEURAL_LINK...");
    setProgress(10);
    playSound("click", 0.3);

    try {
      // 1. Sugere dificuldade baseada no LearningState (Maestria)
      const difficulty = await suggestDifficulty(topic, user?.cognitive || "Standard");
      setProgress(25);
      setStatus("ANALYZING_COGNITIVE_MAP...");

      // 2. Constrói o Prompt Adaptativo
      const promptConfig = {
        topic,
        level: Math.max(1, Math.floor((user?.xp || 0) / 100)),
        difficulty,
        cognitive: user?.cognitive || "Standard",
        stylePrompt: user?.cognitive === "tdah" ? "Dopamine-driven, short bursts" : "Deep technical dive"
      };
      
      const fullPrompt = buildCoursePrompt(promptConfig);
      setProgress(40);
      setStatus("FORGING_CURRICULUM_DATA...");

      // 3. Executa Geração Local (WebLLM) com Proteção de Timeout
      const aiResponse = await generateSafe(fullPrompt);
      setProgress(80);
      setStatus("STABILIZING_ENCRYPTION...");

      // 4. Parse e Validação do JSON
      const courseData = JSON.parse(aiResponse);
      const courseId = `course_${Date.now()}`;

      const newCourse = {
        id: courseId,
        topic,
        difficulty,
        lessons: courseData.lessons || [],
        createdAt: Date.now(),
        status: "active"
      };

      // 5. Salva no IndexedDB e define como curso ativo
      await save("courses", newCourse, courseId);
      await save("user", { ...user, activeCourse: topic }, "main");

      setProgress(100);
      setStatus("SYNC_COMPLETE");
      playSound("success", 0.5);

      // Redireciona para a página do curso
      setTimeout(() => {
        router.push(`/course/${courseId}`);
      }, 1000);

    } catch (err) {
      console.error("Forge Error:", err);
      setStatus("LINK_CRITICAL_FAILURE");
      playSound("error", 0.5);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 pb-32 font-mono">
      {/* HEADER TIPO TERMINAL */}
      <div className="max-w-2xl mx-auto mb-8 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3 text-cyan-500 mb-2">
          <BrainCircuit size={24} />
          <h1 className="text-2xl font-bold tracking-tighter uppercase">Neural_Forge</h1>
        </div>
        <p className="text-xs text-slate-500 italic uppercase">
          Inject topic to generate procedural learning path
        </p>
      </div>

      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleForge} className="space-y-6">
          {/* INPUT PRINCIPAL */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
            <div className="relative bg-slate-900 rounded-lg border border-slate-700">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Asynchronous JavaScript Mastery"
                className="w-full bg-transparent p-4 outline-none text-cyan-50 font-bold placeholder:text-slate-600"
                disabled={loading}
              />
            </div>
          </div>

          {/* INDICADOR DE CARREGAMENTO / PROGRESSO */}
          {loading ? (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="flex justify-between text-[10px] text-cyan-400">
                <span>{status}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 transition-all duration-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center gap-2 text-[9px] text-slate-500">
                <Cpu size={12} className="animate-spin" />
                <span>LOCAL_GPU_EXECUTION_IN_PROGRESS... DO NOT CLOSE TAB.</span>
              </div>
            </div>
          ) : (
            <button
              type="submit"
              className="w-full group relative overflow-hidden p-4 rounded-lg bg-slate-100 text-slate-950 font-black uppercase tracking-tighter hover:bg-white transition-all active:scale-95"
            >
              <div className="flex items-center justify-center gap-2 relative z-10">
                <Sparkles size={18} />
                Forge New Course
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:animate-shimmer" />
            </button>
          )}
        </form>

        {/* INFO DE ADAPTAÇÃO COGNITIVA */}
        {!loading && (
          <div className="mt-12 grid grid-cols-2 gap-4">
            <div className="p-4 rounded border border-slate-800 bg-slate-900/30">
              <div className="flex items-center gap-2 text-purple-400 mb-1">
                <Zap size={14} />
                <span className="text-[10px] font-bold uppercase">Active Profile</span>
              </div>
              <p className="text-lg font-bold text-slate-300">{user?.cognitive || "Standard"}</p>
              <p className="text-[9px] text-slate-500 leading-tight mt-1">
                Content density and explanation style will be adjusted to your neural pattern.
              </p>
            </div>
            
            <div className="p-4 rounded border border-slate-800 bg-slate-900/30">
              <div className="flex items-center gap-2 text-cyan-400 mb-1">
                <Terminal size={14} />
                <span className="text-[10px] font-bold uppercase">Local Core</span>
              </div>
              <p className="text-lg font-bold text-slate-300">WebLLM 3.0</p>
              <p className="text-[9px] text-slate-500 leading-tight mt-1">
                No server calls. Your privacy is encrypted locally in your device's VRAM.
              </p>
            </div>
          </div>
        )}

        {/* AVISO DE ERRO */}
        {status === "LINK_CRITICAL_FAILURE" && (
          <div className="mt-6 p-4 rounded border border-red-900 bg-red-950/20 flex items-center gap-3 text-red-500 text-xs">
            <AlertTriangle size={20} />
            <p>The neural forge failed. Check if WebGPU is active or if your device memory is full.</p>
          </div>
        )}
      </div>
    </div>
  );
}
