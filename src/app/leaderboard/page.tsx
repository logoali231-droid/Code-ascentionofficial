"use client";
import { useEffect, useState } from "react";
import { Shield, Zap, Target, Cpu, Trophy, Activity } from "lucide-react";

interface Competitor {
  id: string;
  username: string;
  xp: number;
  factionId: string;
}

interface FactionDominance {
  [key: string]: number;
}

const FACTION_META: Record<string, { name: string; color: string; icon: any }> =
  {
    shield: {
      name: "Aegis Guard",
      color: "text-[#00FFFF] border-[#00FFFF]",
      icon: Shield,
    },
    zap: {
      name: "Overclockers",
      color: "text-[#FFFF00] border-[#FFFF00]",
      icon: Zap,
    },
    target: {
      name: "Cyber-Hunters",
      color: "text-[#FF007F] border-[#FF007F]",
      icon: Target,
    },
    cpu: {
      name: "Neural Sages",
      color: "text-[#00FF00] border-[#00FF00]",
      icon: Cpu,
    },
    unaligned: {
      name: "Unaligned",
      color: "text-slate-500 border-slate-500",
      icon: Activity,
    },
  };

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<Competitor[]>([]);
  const [dominance, setDominance] = useState<FactionDominance>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/leaderboard");
        const data = await res.json();
        if (data.leaderboard) {
          setLeaderboard(data.leaderboard);
          setDominance(data.dominance);
        }
      } catch (err) {
        console.error("Falha ao ler matriz de dados.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading)
    return (
      <div className="p-6 font-mono text-[#00FF00] bg-black min-h-screen">
        RESTRUTURANDO MATRIZ...
      </div>
    );

  return (
    <div className="p-6 space-y-8 bg-black min-h-screen font-mono text-white">
      {/* HEADER */}
      <div className="border-b border-[#FF007F] pb-4">
        <h1 className="text-2xl font-bold tracking-tighter text-[#FF007F] flex items-center gap-2">
          <Trophy className="w-6 h-6 animate-pulse" /> SYNAPTIC LEAGUE // GUERRA
          DE FACÇÕES
        </h1>
        <p className="text-[10px] text-slate-400 mt-1 uppercase">
          O progresso individual expande a largura de banda da sua facção
        </p>
      </div>

      {/* METRICA GLOBAL DA GUERRA DE FACÇÕES */}
      <div className="border border-slate-800 p-4 rounded bg-slate-950/50 space-y-3">
        <h2 className="text-xs uppercase text-slate-400 font-bold tracking-wider">
          Controle Total da Grade Global (Grid Dominance)
        </h2>
        <div className="w-full h-4 rounded bg-slate-900 flex overflow-hidden border border-slate-800">
          {Object.entries(dominance).map(([fKey, value]) => {
            const meta = FACTION_META[fKey] || FACTION_META.unaligned;
            const bgHex =
              fKey === "shield"
                ? "#00FFFF"
                : fKey === "zap"
                  ? "#FFFF00"
                  : fKey === "target"
                    ? "#FF007F"
                    : "#00FF00";
            return (
              <div
                key={fKey}
                style={{ width: `${value}%`, backgroundColor: bgHex }}
                className="h-full transition-all duration-500"
                title={`${meta.name}: ${value}%`}
              />
            );
          })}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px] uppercase pt-1">
          {Object.entries(dominance).map(([fKey, value]) => {
            const meta = FACTION_META[fKey] || FACTION_META.unaligned;
            return (
              <div
                key={fKey}
                className={`flex items-center gap-1 ${meta.color.split(" ")[0]}`}
              >
                <meta.icon className="w-3 h-3" /> {meta.name}: {value}%
              </div>
            );
          })}
        </div>
      </div>

      {/* PLACAR DE OPERADORES */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-[#00FF00] uppercase">
          // Top Operadores Ativos
        </h2>
        <div className="space-y-2">
          {leaderboard.map((player, idx) => {
            const fMeta =
              FACTION_META[player.factionId] || FACTION_META.unaligned;
            const FactIcon = fMeta.icon;

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 border rounded bg-slate-900/40 backdrop-blur-sm transition-all hover:bg-slate-900/80 ${idx === 0 ? "border-[#FFFF00] shadow-[0_0_8px_rgba(255,255,0,0.2)]" : "border-slate-800"}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-bold w-4 ${idx === 0 ? "text-[#FFFF00]" : "text-slate-400"}`}
                  >
                    {idx + 1}º
                  </span>
                  <div>
                    <div className="text-sm font-bold tracking-tight text-slate-100">
                      {player.username}
                    </div>
                    <div
                      className={`text-[9px] uppercase font-bold flex items-center gap-1 mt-0.5 ${fMeta.color.split(" ")[0]}`}
                    >
                      <FactIcon className="w-2.5 h-2.5" /> {fMeta.name}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono text-[#00FF00] font-bold">
                    {player.xp} XP
                  </div>
                  <div className="text-[8px] text-slate-500 uppercase">
                    Buffer Sincronizado
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
