"use client";

import { useEffect, useState } from "react";
import { get, save } from "@/lib/db";
import { useRouter } from "next/navigation";
import { ArrowLeft, Cpu, Zap, Lock } from "lucide-react";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSkills() {
      const userData = await get("user", "main");
      // Lógica para carregar habilidades do banco ou estado
      setLoading(false);
    }
    loadSkills();
  }, []);

  if (loading) return <div className="p-8 text-cyan-500">CARREGANDO_MATRIZ...</div>;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 p-6">
      <button 
        onClick={() => router.back()}
        className="flex items-center gap-2 text-cyan-400 mb-8 hover:glow"
      >
        <ArrowLeft size={20} /> VOLTAR_AO_NEXUS
      </button>

      <h1 className="text-3xl font-black text-white mb-2 tracking-tighter">
        NEURAL_SKILL_TREE
      </h1>
      <p className="text-slate-500 mb-8 font-mono text-sm">
        Upgrade seu processamento orgânico.
      </p>

      <div className="grid gap-4">
        {/* Exemplo de mapeamento de habilidades com tipos definidos */}
        {skills.map((skill: Skill, index: number) => (
          <div key={skill.id} className="p-4 border border-slate-800 bg-slate-900/50 rounded-lg">
            <h3 className="text-cyan-400 font-bold">{skill.name}</h3>
            <p className="text-xs text-slate-400">{skill.description}</p>
          </div>
        ))}
      </div>
    </main>
  );
}