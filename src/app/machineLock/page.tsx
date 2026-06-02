"use client";

import { resetAppAndClearData } from "@/lib/others/cleanCache";
import { get, save } from "@/lib/others/db";
import { precompileNeuralModules } from "@/lib/others/neuralBundler";
import { playSound } from "@/lib/others/sounds";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  ChevronRight,
  Database,
  Lock,
  Unlock,
  Zap,
  AlertTriangle,
} from "lucide-react";

import { Model, SYSTEM_CONFIG } from "@/config/system";
import { detectSystemCapabilities } from "@/lib/others/modelManager";

const loadEngine = async () => {
  const mod = await import("@/lib/others/webllm");
  return mod.initEngine;
};

export default function MachineLockPage() {
  const router = useRouter();

  const [selectedModel, setSelectedModel] = useState("");
  const [hardwareInfo, setHardwareInfo] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [progress, setProgress] = useState({ progress: 0, text: "READY" });
  const [user, setUser] = useState<any>(null);

  const abortRef = useRef(false);
  const initializingRef = useRef(false);

  useEffect(() => {
    let alive = true;

    async function initHardware() {
      try {
        const specs = await detectSystemCapabilities();
        if (!alive) return;

        setHardwareInfo(specs);
        await precompileNeuralModules();

        const recommended =
          specs?.recommended?.model_id ||
          SYSTEM_CONFIG.AVAILABLE_MODELS[0]?.model_id;

        setSelectedModel(recommended);
      } catch {
        setSelectedModel(
          SYSTEM_CONFIG.AVAILABLE_MODELS[0]?.model_id || ""
        );
      }
    }

    initHardware();
    return () => {
      alive = false;
      abortRef.current = true;
    };
  }, []);

  useEffect(() => {
    async function loadUser() {
      const userData = await get("user", "main");
      if (userData) setUser(userData);
    }
    loadUser();
  }, []);

  const runWithRetry = async (fn: any, retries = 2) => {
    let lastErr;

    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
      }
    }

    throw lastErr;
  };

  const handleInitialize = async () => {
    if (initializingRef.current) return;
    initializingRef.current = true;

    setIsInitializing(true);
    playSound("click", 0.3);

    try {
      const initEngine = await loadEngine();

      await runWithRetry(async () => {
        await initEngine(selectedModel, (p: any) => {
          if (abortRef.current) return;

          setProgress({
            progress: Math.min(100, Math.max(0, Math.round(p.progress * 100))),
            text: p?.text || "LOADING...",
          });
        });
      });

      const updatedUser = {
        ...(user || {}),
        id: "main",
        model: selectedModel,
        engineReady: true,
      };

      await save("user", updatedUser, "main");

      playSound("success", 0.5);

      setTimeout(() => {
        if (!abortRef.current) router.push("/hub");
      }, 900);

    } catch (err) {
      setIsInitializing(false);
      initializingRef.current = false;
      playSound("error", 0.5);
      alert("Falha na inicialização. Verifique memória ou GPU.");
    }
  };

  const isBlocked = (m: Model) => {
    if (!hardwareInfo?.ramGB || !m.minRamGB) return false;
    return hardwareInfo.ramGB < m.minRamGB;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6 font-mono">

      <div className="w-full max-w-md">

        {/* HEADER */}
        <div className="flex flex-col items-center mb-8">
          <div className={`p-6 rounded-full border-2 mb-4 ${
            isInitializing ? "border-cyan-500 animate-pulse" : "border-slate-800"
          }`}>
            {isInitializing ? (
              <Unlock className="text-cyan-400" size={48} />
            ) : (
              <Lock className="text-slate-600" size={48} />
            )}
          </div>

          <h1 className="text-2xl font-black uppercase italic">
            Machine_Auth
          </h1>

          {hardwareInfo && (
            <p className="text-[10px] text-slate-500 mt-2">
              GPU: {hardwareInfo.gpuLimit}MB | RAM: {hardwareInfo.ramGB}GB
            </p>
          )}
        </div>

        {/* LOADING */}
        {isInitializing ? (
          <div className="space-y-3">
            <div className="flex justify-between text-[10px] text-cyan-500">
              <span>{progress.text}</span>
              <span>{progress.progress}%</span>
            </div>

            <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">

            {/* MODELS */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">

              <div className="flex items-center gap-2 mb-4 text-cyan-400">
                <Database size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">
                  Neural_Core
                </span>
              </div>

              <div className="space-y-2">

                {SYSTEM_CONFIG.AVAILABLE_MODELS.map((m: Model) => {

                  const blocked = isBlocked(m);

                  return (
                    <button
                      key={m.model_id}
                      disabled={blocked}
                      onClick={() => setSelectedModel(m.model_id)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        blocked
                          ? "opacity-30 cursor-not-allowed"
                          : selectedModel === m.model_id
                            ? "border-cyan-500 bg-cyan-950/10"
                            : "border-slate-800"
                      }`}
                    >

                      <div className="text-left">
                        <p className="text-sm font-bold flex items-center gap-2">
                          {m.name}
                          {m.model_id.includes("Coder") && (
                            <span className="text-[10px] text-emerald-400">
                              CODE
                            </span>
                          )}
                        </p>

                        <p className="text-[10px] text-slate-500">
                          {m.sizeMb} MB · {m.recommendedFor}
                        </p>

                        {m.experimental && (
                          <p className="text-[9px] text-orange-400">
                            EXPERIMENTAL
                          </p>
                        )}

                        {!m.mobileSafe && (
                          <p className="text-[9px] text-red-400">
                            DESKTOP ONLY
                          </p>
                        )}

                        {blocked && (
                          <p className="text-[9px] text-red-500 flex items-center gap-1">
                            <AlertTriangle size={10} />
                            RAM insuficiente
                          </p>
                        )}
                      </div>

                      {selectedModel === m.model_id && (
                        <Zap size={14} className="text-cyan-400" />
                      )}

                    </button>
                  );
                })}

              </div>
            </div>

            {/* INIT */}
            <button
              onClick={handleInitialize}
              disabled={!selectedModel || isInitializing}
              className="w-full bg-slate-100 text-slate-950 p-5 rounded-2xl font-black uppercase flex items-center justify-center gap-3 disabled:opacity-50"
            >
              Authorize Link <ChevronRight size={18} />
            </button>

            {/* CACHE */}
            <button
              onClick={async () => {
                await resetAppAndClearData();
                alert("Cache limpo.");
              }}
              className="w-full mt-3 bg-slate-900/40 border border-slate-700 text-slate-400 p-3 rounded-xl text-xs uppercase tracking-widest"
            >
              🧹 Clean Cache
            </button>

          </div>
        )}

      </div>
    </div>
  );
}