"use client";
import { PRESTIGE_UPGRADES, PrestigeManager } from "@/lib/ranking/prestige";
import { get, save } from "@/lib/db";
import { useState, useEffect } from "react";
import { Zap, Shield, Brain } from "lucide-react";

export default function PrestigeShop() {
  const [user, setUser] = useState<any>(null);
  const [shards, setShards] = useState(0);
  const [upgrades, setUpgrades] = useState<Record<string, number>>({});

  useEffect(() => {
    async function loadUser() {
      const userData = await get("user", "main");
      if (userData) {
        setUser(userData);
        setShards(userData.memoryShards || 0);
        setUpgrades(userData.prestigeUpgrades || {});
      }
    }
    loadUser();
  }, []);

  const buyUpgrade = async (id: string) => {
    if (!user) return;
    const currentLevel = upgrades[id] || 0;

    // Utilizando o método correto do manager:
    const cost = PrestigeManager.getUpgradeCost(id, currentLevel);

    if (shards < cost) return;

    const newUpgrades = { ...upgrades, [id]: currentLevel + 1 };
    const newShards = shards - cost;

    const newUser = {
      ...user,
      memoryShards: newShards,
      prestigeUpgrades: newUpgrades,
      knowledgeMultiplier: 1 + (newUpgrades['neural_plasticity'] || 0) * 0.1
    };

    await save("user", newUser, "main");
    setUser(newUser);
    setShards(newShards);
    setUpgrades(newUpgrades);
  };

  return (
    <div className="p-6 bg-black min-h-screen text-white">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-indigo-500">FORJA_DE_MEMÓRIA</h1>
        <p className="text-slate-500 font-mono text-xs">Melhorias permanentes através de Shards.</p>
      </header>

      <div className="bg-indigo-900/20 p-6 rounded-3xl mb-8 flex justify-between items-center border border-indigo-500/30 shadow-[0_0_15px_rgba(79,70,229,0.2)]">
        <div>
          <span className="text-indigo-400 font-mono text-sm block">SALDO_ATUAL</span>
          <span className="text-3xl font-black">{shards} 💎</span>
        </div>
        <Brain className="text-indigo-500 opacity-50" size={40} />
      </div>

      <div className="grid gap-4">
        {Object.entries(PRESTIGE_UPGRADES).map(([id, upgrade]: [string, any]) => {
          const level = upgrades[id] || 0;

          // Substituir o cálculo manual pelo método estático:
          const cost = PrestigeManager.getUpgradeCost(id, level);

          return (
            <div key={id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">{upgrade.name}</h3>
                <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded">NÍVEL {level}</span>
              </div>
              <p className="text-slate-400 text-sm mb-4">{upgrade.description}</p>

              <button
                onClick={() => buyUpgrade(id)}
                disabled={shards < cost}
                className={`w-full py-3 rounded-xl font-bold flex justify-between px-4 transition-all ${shards >= cost ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500 opacity-50'
                  }`}
              >
                <span>MELHORAR</span>
                <span>{cost} 💎</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}