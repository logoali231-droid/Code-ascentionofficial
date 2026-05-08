"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { get, save } from "@/lib/db";
import { playSound } from "@/lib/sounds";
import {
  ShieldAlert, Cpu, Lock, Unlock, ChevronRight, Zap, AlertCircle, Database
} from "lucide-react";

import { detectSystemCapabilities, AVAILABLE_MODELS } from "@/lib/modelManager";
import { initEngine } from "@/lib/webllm";

export default function MachineLockPage() {
  const router = useRouter();


  // Dentro do componente:
  const [selectedModel, setSelectedModel] = useState("");
  const [hardwareInfo, setHardwareInfo] = useState<any>(null);

  useEffect(() => {
    const specs = detectSystemCapabilities();
    setHardwareInfo(specs);
    setSelectedModel(specs.recommended.id); // <- AUTO FALLBACK AQUI!
  }, []);
  const [isInitializing, setIsInitializing] = useState(false);
  const [progress, setProgress] = useState({ progress: 0, text: "INITIALIZING..." });
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
        setProgress({ progress: Math.round(p.progress * 100), text: p.text });
      });
      
      if (user) {
        await save("user", { ...user, model: selectedModel, engineReady: true }, "main");
      }
      playSound("success", 0.5);
      setTimeout(() => router.push("/hub"), 1000);
    } catch (err) {
  setIsInitializing(false);
  playSound("error", 0.5);
  // Alerta o usuário que o modelo pode ser pesado demais
  alert("Memory Pressure Detected. Try a smaller model (TinyLlama).");
  console.error("Engine Init Failed:", err);
}
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6 font-mono relative overflow-hidden">
      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className={`p-6 rounded-full border-2 mb-4 transition-all ${isInitializing ? "border-cyan-500 animate-pulse" : "border-slate-800"}`}>
            {isInitializing ? <Unlock className="text-cyan-400" size={48} /> : <Lock className="text-slate-600" size={48} />}
          </div>
          <h1 className="text-2xl font-black uppercase italic">Machine_Auth</h1>
        </div>

        {!isInitializing ? (
          <div className="space-y-4">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4 text-cyan-400">
                <Database size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">Neural_Core</span>
              </div>
              <div className="space-y-2">
                {AVAILABLE_MODELS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${selectedModel === m.id ? "border-cyan-500 bg-cyan-950/10" : "border-slate-800"}`}
                  >
                    <div className="text-left">
                      <p className="text-sm font-bold">{m.name}</p>
                      <p className="text-[10px] text-slate-500">{m.sizeMb} MB</p>
                    </div>
                    {selectedModel === m.id && <Zap size={14} className="text-cyan-400" />}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={handleInitialize} className="w-full bg-slate-100 text-slate-950 p-5 rounded-2xl font-black uppercase flex items-center justify-center gap-3">
              Authorize Link <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-cyan-500 uppercase">
                <span>{progress.text}</span>
                <span>{progress.progress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${progress.progress}%` }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
