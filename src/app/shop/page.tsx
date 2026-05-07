"use client";

import { useEffect, useState } from "react";
import { baseItems } from "@/lib/shopItems";
import { generateAIItem } from "@/lib/aiShop";
import { buyItem } from "@/lib/economy";
import { get, save, getAll } from "@/lib/db";

export default function ShopPage() {
  const [items, setItems] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const u = await get("user", "main");
    const generated = (await getAll("shop")) || [];
    setUser(u);
    // Remove duplicados por ID caso existam
    const combined = [...generated, ...baseItems];
    const uniqueItems = Array.from(new Map(combined.map(item => [item.id, item])).values());
    setItems(uniqueItems);
  }

  async function forgeItem() {
    if (!input.trim() || loading) return;
    setLoading(true);
    setMsg("");

    try {
      const generated = await generateAIItem(input);
      const newItem = {
        ...generated,
        id: generated.id || `ai-${Date.now()}`,
        fake: true, // Tag para identificar itens criados por IA
      };

      await save("shop", newItem);
      await load();
      setInput("");
      setMsg("Item forged successfully!");
    } catch (e) {
      setMsg("The forge failed to stabilize the energy.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBuy(item: any) {
    try {
      await buyItem(item);
      setMsg(`Purchased: ${item.name}!`);
      const u = await get("user", "main");
      setUser(u);
    } catch (e: any) {
      setMsg(e.message || "Insufficient funds or level.");
    }
  }

  const level = Math.floor((user?.xp || 0) / 100);

  return (
    <div className="p-4 pb-24 space-y-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-purple-400">🛒 Forge Market</h1>

      <div className="bg-slate-800 p-4 rounded-xl shadow-lg flex justify-between items-center border border-slate-700">
        <div className="flex flex-col">
          <span className="text-xs opacity-60 uppercase">Credits</span>
          <span className="text-xl font-mono text-yellow-400">💰 {user?.coins || 0}</span>
        </div>
        <div className="h-8 w-[1px] bg-slate-700" />
        <div className="flex flex-col items-center">
          <span className="text-xs opacity-60 uppercase">Rank</span>
          <span className="font-bold">⭐ Level {level}</span>
        </div>
        <div className="h-8 w-[1px] bg-slate-700" />
        <div className="flex flex-col items-end">
          <span className="text-xs opacity-60 uppercase">Streak</span>
          <span className="text-orange-500 font-bold">🔥 {user?.streak || 0}</span>
        </div>
      </div>

      <div className="bg-slate-800 p-4 rounded-xl border border-purple-500/30">
        <h3 className="text-sm font-semibold mb-2">Forge New Equipment</h3>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe a legendary sword..."
            className="flex-1 p-2 bg-slate-900 rounded-lg border border-slate-700 focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            onClick={forgeItem}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg font-bold disabled:opacity-50 transition-all"
          >
            {loading ? "..." : "Forge"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {items.map((item) => {
          const lockedLevel = item.requiredLevel && level < item.requiredLevel;
          const lockedStreak = item.requiredStreak && (user?.streak || 0) < item.requiredStreak;
          const isLocked = lockedLevel || lockedStreak;

          return (
            <div
              key={item.id}
              className={`bg-slate-800 p-4 rounded-xl border transition-all ${
                item.fake ? "border-purple-500/50" : "border-slate-700"
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="font-bold text-lg">
                    {item.icon} {item.name}
                  </h2>
                  <p className="text-sm opacity-70 mb-3">{item.description}</p>
                </div>
                <span className="bg-slate-900 px-2 py-1 rounded text-yellow-400 font-mono">
                  💰 {item.price}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {item.requiredLevel && (
                  <span className={`text-[10px] px-2 py-1 rounded ${lockedLevel ? "bg-red-900/40 text-red-400" : "bg-slate-700"}`}>
                    REQ LVL {item.requiredLevel}
                  </span>
                )}
                {item.requiredStreak && (
                  <span className={`text-[10px] px-2 py-1 rounded ${lockedStreak ? "bg-red-900/40 text-red-400" : "bg-slate-700"}`}>
                    REQ STREAK {item.requiredStreak}
                  </span>
                )}
              </div>

              {item.fake && (
                <p className="text-purple-400 text-[10px] mb-2 animate-pulse font-mono">
                  ⚠ UNSTABLE ENERGY DETECTED IN ARCHIVE
                </p>
              )}

              <button
                disabled={isLocked}
                onClick={() => handleBuy(item)}
                className={`w-full py-2 rounded-lg font-bold transition-all ${
                  isLocked 
                    ? "bg-slate-700 text-slate-500 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-500 active:scale-95"
                }`}
              >
                {isLocked ? "LOCKED" : "BUY ITEM"}
              </button>
            </div>
          );
        })}
      </div>

      {msg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 px-6 py-2 rounded-full shadow-2xl animate-bounce">
          <p className="text-sm font-medium">{msg}</p>
        </div>
      )}
    </div>
  );
}
