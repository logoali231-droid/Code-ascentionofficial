"use client";

import { useEffect, useState } from "react";
import { get, save } from "@/lib/others/db";
import { useRouter } from "next/navigation";
import { ArrowLeft, Cpu, Zap, Lock, CheckCircle2 } from "lucide-react";

// Definição de interface para evitar erros de tipo implícito "any"
interface Skill {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  cost: number;
}

export default function SkillsPage() {
  const router = useRouter();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Carrega os dados do usuário e as habilidades sincronizadas
  useEffect(() => {
    async function loadSkills() {
      const userData = await get("user", "main");
      if (userData) {
        setUser(userData);
        // Sincroniza a árvore de habilidades salva no perfil do usuário
        setSkills(userData.skills || []);
      }
      setLoading(false);
    }
    loadSkills();
  }, []);

  // Handler que usa o 'save' essencial para persistir o upgrade neural
  const handleUnlockSkill = async (skillId: string, cost: number) => {
    if (!user) return;

    // TODO: Se tiver um sistema de economia/nanocredits, validar aqui:
    // if (user.credits < cost) { alert("NANO_CREDITS_INSUFICIENTES"); return; }

    // Cria a nova lista de skills com o alvo desbloqueado
    const updatedSkills = skills.map((skill) =>
      skill.id === skillId ? { ...skill, unlocked: true } : skill,
    );

    // Constrói o novo objeto do usuário atualizado
    const updatedUser = {
      ...user,
      skills: updatedSkills,
      // xp: user.xp // Exemplo se fosse alterar algo mais
    };

    // PERSISTÊNCIA CRÍTICA: Salva no IndexedDB local
    const success = await save("user", updatedUser, "main");

    if (success) {
      setSkills(updatedSkills);
      setUser(updatedUser);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-cyan-500 font-mono">CARREGANDO_MATRIZ...</div>
    );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 p-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-cyan-400 mb-8 hover:text-cyan-300 transition-colors font-mono text-xs tracking-wider"
      >
        <ArrowLeft size={16} /> VOLTAR_AO_NEXUS
      </button>

      <div className="flex items-center gap-3 mb-2">
        <Cpu className="text-fuchsia-500 animate-pulse" size={28} />
        <h1 className="text-3xl font-black text-white tracking-tighter uppercase">
          Neural_Skill_Tree
        </h1>
      </div>
      <p className="text-slate-500 mb-8 font-mono text-sm">
        Upgrade seu processamento orgânico e mude o comportamento da IA.
      </p>

      <div className="grid gap-4 max-w-2xl">
        {skills.length === 0 ? (
          <div className="p-6 border border-dashed border-slate-800 rounded-2xl text-center text-slate-500 font-mono text-sm">
            NENHUMA_HABILIDADE_CONECTADA_A_ESTA_FAÇÃO
          </div>
        ) : (
          skills.map((skill: Skill) => (
            <div
              key={skill.id}
              className={`p-5 border rounded-2xl transition-all duration-300 flex items-center justify-between gap-4 ${
                skill.unlocked
                  ? "border-cyan-500/30 bg-cyan-950/10 shadow-[0_0_15px_rgba(6,182,212,0.05)]"
                  : "border-slate-800 bg-slate-900/40 opacity-80"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3
                    className={`font-bold tracking-tight text-lg ${skill.unlocked ? "text-cyan-400" : "text-slate-300"}`}
                  >
                    {skill.name}
                  </h3>
                  {skill.unlocked && (
                    <CheckCircle2 size={16} className="text-cyan-400" />
                  )}
                </div>
                <p className="text-sm text-slate-400 leading-relaxed max-w-md">
                  {skill.description}
                </p>
                <div className="flex items-center gap-3 pt-1 text-xs font-mono">
                  <span className="text-slate-500">
                    CUSTO:{" "}
                    <span className="text-fuchsia-400 font-bold">
                      {skill.cost} XP
                    </span>
                  </span>
                </div>
              </div>

              <div>
                {skill.unlocked ? (
                  <span className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-xs font-black tracking-widest font-mono text-cyan-400 uppercase">
                    Ativo
                  </span>
                ) : (
                  <button
                    onClick={() => handleUnlockSkill(skill.id, skill.cost)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-fuchsia-600 hover:text-white border border-slate-700 hover:border-fuchsia-500 rounded-xl text-xs font-black tracking-widest font-mono text-slate-300 transition-all active:scale-95"
                  >
                    <Zap size={14} /> UPGRADE
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
