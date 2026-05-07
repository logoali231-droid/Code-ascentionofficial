"use client";

import { useState, useEffect } from "react";
import { get } from "@/lib/db";
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
  TrendingUp
} from "lucide-react";
import { InventoryItem } from "@/types";

export default function ShopPage() {
  const [userCoins, setUserCoins] = useState(0);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [shopItems, setShopItems] = useState<InventoryItem[]>([
    {
      id: "base_xp_booster",
      name: "Neural Overclock",
      description: "Direct injection of XP data. Instant progression.",
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
      description: "Passive chip that stabilizes neural connections during JS exercises.",
      price: 1200,
      rarity: "Rare",
      type: "chip",
      effect: "xp_boost",
      effectValue: 1.2,
      quantity: 1,
      acquiredAt: 0
    }
  ]);

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

    try {
      setLoading(true);
      await buyItem(item);
      // Atualização local imediata para feedback visual
      setUserCoins(prev => prev - item.price);
    } catch (err) {
      console.error("Purchase failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const rarityStyles: any = {
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
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Acquire neural enhancements and boosters</p>
        </div>
        
        <div className="bg-slate-900 border border-yellow-600/30 px-4 py-2 rounded-xl flex items-center gap-3 shadow-[0_0_20px_rgba(234,179,8,0.05)]">
          <Coins className="text-yellow-500" size={18} />
          <span className="text-xl font-black text-yellow-500 tracking-tighter">
            {userCoins.toLocaleString()}
          </span>
        </div>
      </div>

      {/* CUSTOM FORGE SECTION */}
      <div className="mb-10 relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
        <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 text-purple-400 mb-4">
            <Sparkles size={18} />
            <h2 className="text-xs font-black uppercase tracking-widest">Neural_Custom_Forge</h2>
          </div>
          <div className="flex gap-3">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Request custom gear (e.g. 'Golden React Chip')..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-500 transition-colors"
            />
            <button className="bg-purple-600 hover:bg-purple-500 text-white px-4 rounded-xl transition-colors">
              <ArrowRight size={20} />
            </button>
          </div>
          <p className="text-[9px] text-slate-600 mt-3 uppercase">Requires 'Legendary Merchant' status to execute custom orders.</p>
        </div>
      </div>

      {/* ITEMS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {shopItems.map((item) => (
          <div 
            key={item.id}
            className={`relative flex flex-col p-6 rounded-2xl border-2 transition-all duration-500 ${rarityStyles[item.rarity]}`}
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg bg-slate-950 border ${rarityStyles[item.rarity].split(' ')[0]}`}>
                {item.type === "booster" ? <Zap size={24} /> : <Cpu size={24} />}
              </div>
              <div className="text-right">
                <span className="block text-[10px] font-black uppercase opacity-60">{item.rarity}</span>
                <span className="block text-[10px] font-bold uppercase tracking-tighter opacity-40">{item.type}</span>
              </div>
            </div>

            <h3 className="text-lg font-black uppercase tracking-tighter mb-2">{item.name}</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6 flex-1">
              {item.description}
            </p>

            <div className="mt-auto pt-4 border-t border-slate-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins size={14} className="text-yellow-600" />
                <span className="font-black text-slate-200">{item.price}</span>
              </div>

              <button
                onClick={() => handlePurchase(item)}
                disabled={loading || userCoins < item.price}
                className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                  userCoins >= item.price 
                    ? "bg-slate-100 text-slate-950 hover:bg-white active:scale-95" 
                    : "bg-slate-900 text-slate-700 cursor-not-allowed border border-slate-800"
                }`}
              >
                {userCoins >= item.price ? "Acquire_Link" : "Insufficient_Funds"}
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
