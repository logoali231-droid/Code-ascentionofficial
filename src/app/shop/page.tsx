"use client";
import { useEffect, useState } from "react";
import { baseItems } from "@/lib/shopItems";
import { generateAIItem } from "@/lib/aiShop";
import { buyItem } from "@/lib/economy";
import { get, save, getAll } from "@/lib/db";
import { calculateLevel } from "@/lib/level";

export default function ShopPage() {
  const [items, setItems] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState("");
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastForge, setLastForge] = useState(0);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const u = await get("user", "main");
    setUser(u);
    
    const raw = await getAll("shop");
    const generated = Array.isArray(raw) ? raw : [];
    
    // Base items sempre disponíveis + os gerados
    setItems([...generated, ...baseItems]);
  }

  async function forgeItem() {
    if (!input.trim() || loading) return;
    
    // Simples rate-limit visual
    if (Date.now() - lastForge < 5000) {
      setMsg("Forge cooling down...");
      return;
    }

    setLoading(true);
    setMsg("");

    try {
      const generated = await generateAIItem(input);
      setLastForge(Date.now());
      
      const newItem = {
        ...generated,
        id: generated.id || `ai-${Date.now()}`,
        fake: true, // Tag para identificar itens criados por IA
      };

      // Carrega loja atual e aplica limite FIFO no banco de dados
      const currentShopRaw = await getAll("shop");
      let allGenerated = Array.isArray(currentShopRaw) ? currentShopRaw : [];
      
      allGenerated.push(newItem);

      // Limita a 50 itens procedurais para não estourar o banco
      if (allGenerated.length > 50) {
        allGenerated.shift();
      }

      await save("shop", allGenerated, "all"); // Assumindo chave "all" para persistência global
      
      await load();
      setInput("");
      setMsg("Item forged successfully!");

    } catch (e) {
      console.error(e);
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

  const currentLevel = calculateLevel(user?.xp);

  return (
    <div className="p-6 pb-24 max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-center">🛒 Forge Market</h1>
      
      <div className="card text-center space-y-2">
        <p>Coins: <span className="text-yellow-400 font-bold">{user?.coins || 0}</span></p>
        <p>Level: {currentLevel}</p>
        <p className="text-xs text-gray-400">{msg}</p>
      </div>

      <div className="card space-y-4">
        <h2 className="font-bold">Forge AI Item</h2>
        <input 
          className="w-full p-2 rounded" 
          placeholder="e.g. A sword that ignores errors" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button 
          onClick={forgeItem} 
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-2 rounded"
        >
          {loading ? "Forging..." : "Forge Item"}
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item, idx) => (
          <div key={item.id || idx} className="card flex items-center justify-between border border-slate-700">
            <div className="flex-1">
              <h3 className="font-bold">{item.name}</h3>
              <p className="text-sm text-slate-400">{item.description}</p>
              <p className="text-xs text-blue-400 mt-1">Price: {item.price}</p>
            </div>
            <button 
              onClick={() => handleBuy(item)}
              className="ml-4 px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-sm font-bold"
            >
              Buy
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}            value={input}
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
