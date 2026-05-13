"use client";

import { useEffect, useState } from "react";
import { get, getAll, save } from "@/lib/db";
import { useRouter } from "next/navigation";
import { Book, Cpu } from "lucide-react";
import { calculateLevel } from "@/lib/level";
import { getLevelTitle } from "@/lib/level";
import { PrestigeManager } from "@/lib/ranking/prestige";

export default function Hub() {
  const [courses, setCourses] = useState<any[]>([]);
  const [userLevel, setUserLevel] = useState(0);
  const [showAscensionModal, setShowAscensionModal] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      const userData = await get("user", "main");

      // Proteção: Se a engine não estiver pronta (WebLLM), volta para a trava
      if (!userData?.engineReady) {
        router.push("/machineLock");
        return;
      }

      setUser(userData);
      const level = calculateLevel(userData.xp || 0);
      setUserLevel(level);
      const title = getLevelTitle(userData)
      const coursesData = await getAll("courses");
      setCourses(coursesData);
    }
    loadData();
  }, [router]);

  async function selectCourse(c: any) {
    if (!user) return;
    await save("user", {
      ...user,
      activeCourse: c.id,
    }, "main");
    router.push("/course");
  }

  async function handlePerformAscension() {
    if (!user) return;

    // 1. Prepara os stats atuais ou cria um padrão caso seja a primeira ascensão
    const currentPrestigeStats = user.prestigeStats || {
      ascensionCount: 0,
      totalMemoryShards: 0,
      spentMemoryShards: 0,
      knowledgeMultiplier: 1,
      lastAscensionDate: Date.now(),
      unlockedTiers: []
    };

    // 2. Executa a lógica de cálculo via Manager
    const result = PrestigeManager.performAscension(
      currentPrestigeStats,
      user.xp || 0,
      user.factionId || "neutral"
    );

    // 3. Monta o novo objeto de usuário com o RESET
    const updatedUser = {
      ...user,
      xp: 0, // O XP volta a zero
      prestigeStats: result.newStats,
      // Shards totais para uso na Prestige Shop
      memoryShards: (user.memoryShards || 0) + result.shardsGained
    };

    // 4. Salva no IndexedDB e recarrega a página para limpar estados globais
    await save("user", updatedUser, "main");

    setShowAscensionModal(false);

    // Feedback visual opcional antes do reload pode ser adicionado aqui
    window.location.reload();
  }

  return (
    <div className="p-4 pb-24 text-white min-h-screen bg-black">
      {/* Botão de Ascensão Neural - Só aparece no Nível 25+ */}
      {userLevel >= 25 && (
        <div className="mb-8 p-6 rounded-3xl bg-gradient-to-br from-indigo-900/40 to-black border border-indigo-500/30 shadow-[0_0_30px_rgba(79,70,229,0.1)]">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400">
              <Cpu size={32} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Protocolo de Ascensão</h3>
              <p className="text-slate-400 text-sm">Você atingiu o limite estável. Evolua para transcender.</p>
            </div>
          </div>

          <button
            onClick={() => setShowAscensionModal(true)}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] active:scale-95"
          >
            INICIAR ASCENSÃO_NEURAL
          </button>
        </div>
      )}

      {/* Modal de Confirmação de Reset */}
      {showAscensionModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-bold text-red-500 mb-4 font-mono uppercase tracking-tighter">Aviso de Desintegração</h2>
            <p className="text-slate-300 mb-6 leading-relaxed">
              A Ascensão irá limpar o seu <span className="text-white font-bold">XP e Nível atual</span>.
              Em troca, sua consciência reterá <span className="text-indigo-400 font-bold">Memory Shards</span> permanentes.
            </p>

            <div className="bg-black/50 p-4 rounded-xl mb-6 border border-white/5">
              <p className="text-xs text-indigo-300/70 font-mono italic">
                + Multiplicador de conhecimento permanente desbloqueado.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowAscensionModal(false)}
                className="flex-1 py-3 font-bold text-slate-500 hover:text-slate-300 transition-colors"
              >
                ABORTAR
              </button>
              <button
                onClick={handlePerformAscension}
                className="flex-1 py-3 bg-white text-black font-black rounded-xl hover:bg-indigo-400 transition-all"
              >
                CONFIRMAR
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-xl font-bold mb-4 flex gap-2 items-center">
        <Book size={20} className="text-blue-400" /> Cursos Disponíveis
      </h1>

      <div className="space-y-3">
        {courses.map((c) => (
          <div
            key={c.id}
            onClick={() => selectCourse(c)}
            className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 cursor-pointer hover:bg-slate-800 hover:border-blue-500/50 transition-all"
          >
            <h3 className="font-semibold text-slate-100">{c.topic}</h3>
            <p className="text-sm text-slate-400">
              Nível {c.level} • {c.difficulty}
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push("/new")}
        className="mt-6 w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-bold transition-all shadow-lg"
      >
        Novo Curso +
      </button>
    </div>
  );
}