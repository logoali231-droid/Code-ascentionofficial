"use client";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, save } from "@/lib/db";
import { useRouter } from "next/navigation";
import { Book, Cpu, Zap } from "lucide-react";
import { calculateLevel } from "@/lib/level";
import { PrestigeManager } from "@/lib/ranking/prestige";

export default function Hub() {
  const router = useRouter();
  const [showAscensionModal, setShowAscensionModal] = useState(false);

  // Reatividade em tempo real com o IndexedDB
  const user = useLiveQuery(() => db.table("user").get("main"));
  const courses = useLiveQuery(() => db.table("courses").toArray()) || [];
  
  const userLevel = user ? calculateLevel(user.xp || 0) : 0;

  if (user && !user.engineReady) { router.push("/machineLock"); return null; }

  async function selectCourse(c: any) {
    if (!user) return;
    await save("user", { ...user, activeCourse: c.id }, "main");
    router.push("/course");
  }

  async function handlePerformAscension() {
    if (!user) return;
    const result = PrestigeManager.performAscension(user.prestigeStats || {}, user.xp || 0, user.factionId || "neutral");
    await save("user", { ...user, xp: 0, prestigeStats: result.newStats, memoryShards: (user.memoryShards || 0) + result.shardsGained }, "main");
    setShowAscensionModal(false);
  }

  return (
    <div className="p-4 pb-24 text-white min-h-screen bg-black font-sans">
      {userLevel >= 25 && (
        <div className="mb-8 p-6 rounded-3xl bg-gradient-to-br from-indigo-900/40 to-black border border-indigo-500/30 shadow-[0_0_30px_rgba(79,70,229,0.1)]">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400"><Cpu size={32} className="animate-pulse" /></div>
            <div>
              <h3 className="text-xl font-bold italic">PROTOCOLO DE ASCENSÃO</h3>
              <p className="text-slate-400 text-xs uppercase tracking-widest">Cognição Máxima Atingida</p>
            </div>
          </div>
          <button onClick={() => setShowAscensionModal(true)}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] active:scale-95">
            INICIAR ASCENSÃO_NEURAL
          </button>
        </div>
      )}

      {showAscensionModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full">
            <h2 className="text-2xl font-bold text-red-500 mb-4 uppercase tracking-tighter">Aviso de Desintegração</h2>
            <p className="text-slate-300 mb-6 text-sm">A Ascensão resetará seu XP atual para Level 1 em troca de Shards Permanentes.</p>
            <div className="flex gap-4">
              <button onClick={() => setShowAscensionModal(false)} className="flex-1 py-3 font-bold text-slate-500">ABORTAR</button>
              <button onClick={handlePerformAscension} className="flex-1 py-3 bg-white text-black font-black rounded-xl">CONFIRMAR</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-black italic flex gap-2 items-center"><Book size={20} className="text-blue-400" /> DATABASE_COURSES</h1>
        <div className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-bold text-cyan-400 border border-cyan-500/30">LVL_{userLevel}</div>
      </div>

      <div className="grid gap-3">
        {courses.map((c: any) => (
          <div key={c.id} onClick={() => selectCourse(c)}
            className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 cursor-pointer hover:border-blue-500/50 transition-all group">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-100 group-hover:text-blue-400 transition-colors uppercase tracking-tight">{c.topic}</h3>
                <p className="text-[10px] text-slate-500 font-mono mt-1">DIFFICULTY: {c.difficulty} • NODES: {c.nodes || 12}</p>
              </div>
              <Zap size={14} className="text-slate-700 group-hover:text-yellow-500" />
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => router.push("/new")} className="mt-8 w-full bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl font-black uppercase tracking-widest shadow-[0_10px_20px_rgba(37,99,235,0.2)]">Novo Curso +</button>
    </div>
  );
}