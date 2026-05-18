"use client";
import { useEffect, useState } from "react";
import { get, save } from "@/lib/db";
import { useRouter } from "next/navigation";
import { FACTIONS } from "@/lib/ranking/factions";
import { Shield, Zap, Target, Cpu, ChevronRight } from "lucide-react";
import { calculateLevel } from "@/lib/level";

export default function FactionsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAccess() {
      const userData = await get("user", "main");
      if (!userData || calculateLevel(userData.xp || 0) < 25) {
        router.push("/hub"); // Redireciona se não tiver nível 25
        return;
      }
      setUser(userData);
      setLoading(false);
    }
    checkAccess();
  }, [router]);

  const selectFaction = async (factionId: string) => {
    if (!user) return;
    const updatedUser = {
      ...user,
      faction: factionId,
      themeColor: FACTIONS[factionId].primaryColor,
    };
    await save("user", updatedUser, "main");
    router.push("/hub");
  };

  if (loading)
    return (
      <div className="p-8 text-cyan-500 animate-pulse">
        VERIFICANDO CREDENCIAIS...
      </div>
    );

  return (
    <div className="min-h-screen bg-black p-6 text-white">
      <header className="mb-12">
        <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
          SINCRONIZAÇÃO_CONSCIENTE
        </h1>
        <p className="text-slate-500 font-mono text-sm mt-2">
          Escolha a sua linhagem de processamento.
        </p>
      </header>

      <div className="grid gap-6">
        {Object.values(FACTIONS).map((f) => (
          <div
            key={f.id}
            onClick={() => selectFaction(f.id)}
            style={{ borderColor: `${f.primaryColor}44` }}
            className="relative group border-2 bg-slate-900/50 p-6 rounded-2xl cursor-pointer hover:scale-[1.02] transition-all"
          >
            <div className="flex justify-between items-start mb-4">
              <div
                style={{ color: f.primaryColor }}
                className="p-3 bg-slate-800 rounded-xl"
              >
                <Target size={24} />
              </div>
              <span
                style={{ backgroundColor: f.primaryColor }}
                className="px-2 py-1 text-[10px] font-bold text-black rounded"
              >
                DISPONÍVEL
              </span>
            </div>

            <h2 className="text-2xl font-bold mb-1">{f.name}</h2>
            <p className="text-slate-400 text-sm mb-4 italic">"{f.motto}"</p>

            <div className="space-y-2 border-t border-slate-800 pt-4">
              {f.bonuses.map((b, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs font-mono"
                >
                  <Zap size={12} className="text-yellow-500" />
                  <span>{b.description}</span>
                </div>
              ))}
            </div>

            <div className="absolute right-6 bottom-6 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight style={{ color: f.primaryColor }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
