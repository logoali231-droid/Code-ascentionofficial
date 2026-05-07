"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { get, save } from "@/lib/db";
import { initEngine } from "@/lib/webllm";
import { playSound } from "@/lib/sounds";
import { 
  ShieldAlert, 
  Cpu, 
  Lock, 
  Unlock, 
  ChevronRight, 
  Zap, 
  AlertCircle,
  Database
} from "lucide-react";
import { initEngine, AVAILABLE_MODELS } from "@/lib/webllm";

// Lista movida para dentro do escopo ou declarada sem export para não quebrar o Next.js
const AVAILABLE_MODELS = [
  { id: "Llama-3-8B-Instruct-v0.1-q4f16_1-MLC", name: "Llama 3 8B (Fast)", size: "4.5GB", vram: "High" },
  { id: "Phi-3-mini-4k-instruct-q4f16_1-MLC", name: "Phi-3 Mini", size: "2.3GB", vram: "Mid" },
  { id: "gemma-2b-it-q4f16_1-MLC", name: "Gemma 2B", size: "1.6GB", vram: "Low" }
];

export default function MachineLockPage() {
  const router = useRouter();
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  const [isInitializing, setIsInitializing] = useState(false);
  const [progress, setProgress] = useState({ progress: 0, text: "INITIALIZING_SYSTEM_CORE..." });
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    async function loadUser() {
      const userData = await get("user", "main");
      if (userData) setUser(userData);
    }
    loadUser();
  }, []);

  const handleInitialize = async () => {
    setIsInitializing(true);
    playSound("click", 0.3);

    try {
      await initEngine(selectedModel, (p) => {
        setProgress({
          progress: Math.round(p.progress * 100),
          text: p.text
        });
      });

      // Atualiza o modelo escolhido no banco
      if (user) {
        await save("user", { ...user, model: selectedModel, engineReady: true }, "main");
      }

      playSound("success", 0.5);
      setTimeout(() => {
        router.push("/hub");
      }, 1000);

    } catch (err) {
      console.error("Machine Init Error:", err);
      setIsInitializing(false);
      playSound("error", 0.5);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6 font-mono relative overflow-hidden">
      
      {/* BACKGROUND DECORATION */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* LOCK ICON HEADER */}
        <div className="flex flex-col items-center mb-8 animate-in fade-in zoom-in duration-700">
          <div className={`p-6 rounded-full border-2 mb-4 transition-all duration-1000 ${isInitializing ? "border-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.3)] animate-pulse" : "border-slate-800"}`}>
            {isInitializing ? (
              <Unlock className="text-cyan-400" size={48} />
            ) : (
              <Lock className="text-slate-600" size={48} />
            )}
          </div>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic text-center">
            Machine_Authentication
          </h1>
          <p className="text-[10px] text-slate-500 mt-2 tracking-[0.3em]">LOCAL_ENCRYPTION_REQUIRED</p>
        </div>

        {/* MODEL SELECTION */}
        {!isInitializing ? (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4 text-cyan-400">
                <Database size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Select_Neural_Core</span>
              </div>
              
              <div className="space-y-2">
                {AVAILABLE_MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      selectedModel === m.id 
                      ? "border-cyan-500 bg-cyan-950/20 text-cyan-100" 
                      : "border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-500"
                    }`}
                  >
                    <div className="text-left">
                      <p className="text-sm font-bold">{m.name}</p>
                      <p className="text-[9px] opacity-60 uppercase">{m.size} • VRAM: {m.vram}</p>
                    </div>
                    {selectedModel === m.id && <Zap size={14} className="text-cyan-400" />}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleInitialize}
              className="group w-full bg-slate-100 text-slate-950 p-5 rounded-2xl font-black uppercase tracking-tighter flex items-center justify-center gap-3 hover:bg-white transition-all active:scale-95"
            >
              Authorize Machine Link
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
            
            <div className="flex items-start gap-3 p-4 bg-yellow-950/10 border border-yellow-900/30 rounded-xl">
              <AlertCircle size={18} className="text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-[9px] text-yellow-600/80 leading-relaxed uppercase">
                Warning: First-time authentication requires downloading the neural weights ({AVAILABLE_MODELS.find(m => m.id === selectedModel)?.size}). Data charges may apply.
              </p>
            </div>
          </div>
        ) : (
          /* INITIALIZING VIEW */
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-cyan-500">
                <span>{progress.text}</span>
                <span>{progress.progress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                />
              </div>
            </div>
            
            <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center gap-4">
              <Cpu className="text-cyan-500 animate-spin" size={24} />
              <div className="text-[10px] text-slate-400 leading-tight uppercase">
                Mapping local GPU registers...<br/>
                Allocating VRAM buffers...<br/>
                Securing WebGPU context...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER STATS */}
      <div className="absolute bottom-10 left-0 w-full px-10 flex justify-between opacity-30 text-[8px] font-bold tracking-[0.4em] uppercase">
        <div className="flex items-center gap-2">
          <ShieldAlert size={10} />
          Protocol_Secure
        </div>
        <div>Ver_3.0.4_Ascension</div>
      </div>
    </div>
  );
}
