"use client";

import { useState, useEffect, useRef } from "react";
import { get, save } from "@/lib/db";
import { buyItem } from "@/lib/economy";
import { playSound } from "@/lib/sounds";
import { 
  ShoppingCart, 
  Zap, 
  Cpu, 
  Box, 
  Sparkles, 
  Coins, 
  Lock,
  ArrowRight,
  TrendingUp,
  Loader2
} from "lucide-react";
import { InventoryItem } from "@/types/core";

export default function ShopPage() {
  const [userCoins, setUserCoins] = useState(0);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isForging, setIsForging] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  const [shopItems, setShopItems] = useState<InventoryItem[]>([
    {
      id: "base_xp_booster",
      name: "Neural Overclock",
      description: "Injeção direta de dados de XP. Progressão instantânea.",
      price: 250,
      rarity: "Uncommon",
      type: "booster",
      effect: "xp_grant",
      effectValue: 500,
      quantity: 1,
      acquiredAt: 0
    },
    {
      id: "logic_chip_v1",
      name: "Logic Gate v1",
      description: "Chip passivo que estabiliza conexões neurais durante exercícios.",
      price: 1200,
      rarity: "Rare",
      type: "chip",
      effect: "xp_boost",
      effectValue: 1.2,
      quantity: 1,
      acquiredAt: 0
    }
  ]);

  // Inicializa o Worker para processamento pesado (evita travar o M23)
  useEffect(() => {
    workerRef.current = new Worker(new URL("@/lib/shop.worker.ts", import.meta.url));
    
    workerRef.current.onmessage = (e) => {
      const { type, payload, error } = e.data;
      if (type === "PURCHASE_COMPLETE") {
        setUserCoins(payload.newBalance);
        playSound("success", 0.5);
        setLoading(false);
      } else if (type === "FORGE_RESULT") {
        setShopItems(prev => [payload.newItem, ...prev]);
        setIsForging(false);
        playSound("upgrade", 0.6);
      } else if (error) {
        console.error("Worker Error:", error);
        setLoading(false);
        setIsForging(false);
      }
    };

    return () => workerRef.current?.terminate();
  }, []);

  useEffect(() => {
    async function loadStats() {
      const user = await get("user", "main");
      if (user) setUserCoins(user.coins || 0);
    }
    loadStats();
    const interval = setInterval(loadStats, 2000);
    return () => clearInterval(interval);
  }, []);

  const handlePurchase = async (item: InventoryItem) => {
    if (userCoins < item.price) {
      playSound("error", 0.4);
      return;
    }

    setLoading(true);
    // Envia a transação para o Worker para não engasgar a UI a 60fps
    workerRef.current?.postMessage({
      type: "PROCESS_PURCHASE",
      payload: { item, currentCoins: userCoins }
    });
  };

  const handleCustomForge = () => {
    if (!input.trim() || isForging) return;
    setIsForging(true);
    // O Worker utiliza a lógica do shopGenerator/AI para criar o item
    workerRef.current?.postMessage({
      type: "GENERATE_CUSTOM_ITEM",
      payload: { prompt: input }
    });
    setInput("");
  };

  const rarityStyles: Record<string, string> = {
    Common: "border-slate-800 text-slate-400 bg-slate-900/30",
    Uncommon: "border-green-900/50 text-green-400 bg-green-950/10",
    Rare: "border-blue-800/50 text-blue-400 bg-blue-950/10",
    Epic: "border-purple-700/50 text-purple-400 bg-purple-950/10",
    Legendary: "border-yellow-600/50 text-yellow-500 bg-yellow-950/20 shadow-[0_0_15px_rgba(234,179,8,0.1)]",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 pb-32 font-mono">
      {/* SHOP HEADER */}
      <div className="flex justify-between items-end mb-8 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3 text-yellow-500 mb-2">
            <ShoppingCart size={28} />
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">Black_Market</h1>
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Neural enhancements & boosters</p>
        </div>
        
        <div className="bg-slate-900 border border-yellow-600/30 px-4 py-2 rounded-xl flex items-center gap-3">
          <Coins className="text-yellow-500" size={18} />
          <span className="text-xl font-black text-yellow-500 tracking-tighter">
            {userCoins.toLocaleString()}
          </span>
        </div>
      </div>

      {/* CUSTOM FORGE SECTION */}
      <div className="mb-10 relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-20"></div>
        <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 text-purple-400 mb-4">
            {isForging ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            <h2 className="text-xs font-black uppercase tracking-widest">
              {isForging ? "Forging_Neural_Pattern..." : "Neural_Custom_Forge"}
            </h2>
          </div>
          <div className="flex gap-3">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isForging}
              placeholder="Request custom gear (e.g. 'Golden React Chip')..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50"
            />
            <button 
              onClick={handleCustomForge}
              disabled={isForging || !input.trim()}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 rounded-xl transition-colors disabled:bg-slate-800"
            >
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* ITEMS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {shopItems.map((item) => (
          <div 
            key={item.id}
            className={`relative flex flex-col p-6 rounded-2xl border-2 transition-all duration-500 ${rarityStyles[item.rarity] || rarityStyles.Common}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                {item.type === "booster" ? <Zap size={24} /> : <Cpu size={24} />}
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-black uppercase opacity-60">{item.rarity}</span>
                <span className="block text-[10px] font-bold uppercase tracking-tighter opacity-40">{item.type}</span>
              </div>
            </div>

            <h3 className="text-lg font-black uppercase tracking-tighter mb-2">{item.name}</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6 flex-1">{item.description}</p>

            <div className="mt-auto pt-4 border-t border-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins size={14} className="text-yellow-600" />
                <span className="font-black text-slate-200">{item.price}</span>
              </div>

              <button
                onClick={() => handlePurchase(item)}
                disabled={loading || userCoins < item.price}
                className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                  userCoins >= item.price && !loading
                    ? "bg-slate-100 text-slate-950 hover:bg-white active:scale-95" 
                    : "bg-slate-900 text-slate-700 cursor-not-allowed border border-slate-800"
                }`}
              >
                {loading ? "Processing..." : userCoins >= item.price ? "Acquire_Link" : "Insufficient_Funds"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MARKET STATS */}
      <div className="mt-12 grid grid-cols-3 gap-4 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
        <div className="p-4 border border-slate-800 rounded-xl flex flex-col items-center gap-2">
          <TrendingUp size={16} />
          <span className="text-[8px] font-bold uppercase">Volatility: 0.4%</span>
        </div>
        <div className="p-4 border border-slate-800 rounded-xl flex flex-col items-center gap-2">
          <Lock size={16} />
          <span className="text-[8px] font-bold uppercase">Encrypted</span>
        </div>
        <div className="p-4 border border-slate-800 rounded-xl flex flex-col items-center gap-2">
          <Box size={16} />
          <span className="text-[8px] font-bold uppercase">Nodes: 128</span>
        </div>
      </div>
    </div>
  );
}
