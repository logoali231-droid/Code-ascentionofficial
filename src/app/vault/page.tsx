"use client";

import { useEffect, useState } from "react";
import { get } from "@/lib/db";
import { useItem } from "@/lib/economy";
import { 
  Vault, 
  Cpu, 
  Zap, 
  Box, 
  ShieldCheck, 
  Info, 
  CheckCircle2, 
  Layers 
} from "lucide-react";
import { InventoryItem } from "@/types";

export default function VaultPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  useEffect(() => {
    loadInventory();
    const interval = setInterval(loadInventory, 3000);
    return () => clearInterval(interval);
  }, []);

  async function loadInventory() {
    const user = await get("user", "main");
    if (user && user.inventory) {
      setInventory(user.inventory);
    }
    setLoading(false);
  }

  const filteredItems = inventory.filter(item => {
    if (filter === "all") return true;
    return item.type === filter;
  });

  const handleUse = async (itemId: string) => {
    await useItem(itemId);
    await loadInventory();
    // Se o item for consumível e acabar, fecha o modal
    if (selectedItem?.type === "booster" && selectedItem.quantity <= 1) {
      setSelectedItem(null);
    }
  };

  const rarityColors: any = {
    Common: "text-slate-400 border-slate-700",
    Uncommon: "text-green-400 border-green-800",
    Rare: "text-blue-400 border-blue-700",
    Epic: "text-purple-400 border-purple-600",
    Legendary: "text-yellow-500 border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.2)]",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6 pb-32 font-mono">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Vault className="text-cyan-500" size={28} />
          <h1 className="text-2xl font-black tracking-tighter uppercase">Neural_Vault</h1>
        </div>
        <div className="text-[10px] text-slate-500 text-right">
          STORAGE_CAPACITY: {inventory.length}/100<br/>
          ENCRYPTION: AES-256-CYBER
        </div>
      </div>

      {/* FILTROS */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
        {["all", "chip", "booster", "relic"].map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase border transition-all ${
              filter === t ? "bg-cyan-500 border-cyan-400 text-slate-950" : "border-slate-800 text-slate-500"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* GRID DE ITENS */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-600 animate-pulse">
          <Layers size={48} className="mb-4" />
          <p>DECRYPTING_STORAGE...</p>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedItem(item)}
              className={`relative aspect-square rounded-lg border-2 bg-slate-900/50 flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
                item.equipped ? "border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.3)]" : rarityColors[item.rarity].split(" ")[1]
              }`}
            >
              {item.type === "chip" && <Cpu size={24} className={item.equipped ? "text-cyan-400" : "text-slate-500"} />}
              {item.type === "booster" && <Zap size={24} className="text-yellow-500" />}
              {item.type === "relic" && <Box size={24} className="text-purple-500" />}
              
              <span className="text-[8px] font-bold uppercase text-center px-1 truncate w-full">
                {item.name}
              </span>

              {item.quantity > 1 && (
                <span className="absolute -top-2 -right-2 bg-slate-100 text-slate-950 text-[9px] px-1.5 rounded-full font-bold">
                  x{item.quantity}
                </span>
              )}

              {item.equipped && (
                <div className="absolute -bottom-2 bg-cyan-500 text-slate-950 text-[7px] px-2 rounded font-black">
                  ACTIVE
                </div>
              )}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-slate-800 rounded-xl">
          <p className="text-slate-600 text-xs uppercase tracking-widest">Vault is currently empty</p>
        </div>
      )}

      {/* MODAL DE DETALHES (DRAWER) */}
      {selectedItem && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-t-2xl p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className={`text-[10px] font-bold uppercase ${rarityColors[selectedItem.rarity].split(" ")[0]}`}>
                  {selectedItem.rarity} {selectedItem.type}
                </span>
                <h2 className="text-xl font-black text-slate-100">{selectedItem.name}</h2>
              </div>
              <button onClick={() => setSelectedItem(null)} className="text-slate-500 hover:text-white">
                <XCircle size={24} />
              </button>
            </div>

            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              {selectedItem.description}
            </p>

            <div className="bg-slate-950/50 rounded-lg p-4 border border-slate-800 mb-6">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <ShieldCheck size={14} />
                <span>PRIMARY_EFFECT:</span>
              </div>
              <p className="text-cyan-400 font-bold">
                {selectedItem.effect || "Neutral connection improvement."}
              </p>
            </div>

            <button
              onClick={() => handleUse(selectedItem.id)}
              className={`w-full py-4 rounded-xl font-black uppercase tracking-tighter transition-all ${
                selectedItem.equipped 
                  ? "bg-red-900/20 text-red-500 border border-red-900" 
                  : "bg-slate-100 text-slate-950 hover:bg-white"
              }`}
            >
              {selectedItem.type === "chip" 
                ? (selectedItem.equipped ? "Deactivate Chip" : "Equip Neural Link") 
                : "Execute Program (Use)"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function XCircle({ size, className }: { size: number, className: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>
    </svg>
  );
      }
