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

    // 🧠 FIX: sempre usar getAll (não get("shop","generated"))
    const generated = (await getAll("shop")) || [];

    setUser(u);

    // merge seguro
    setItems([...generated, ...baseItems]);
  }

  async function forgeItem() {
    if (!input.trim()) return;

    setLoading(true);
    setMsg("");

    try {
      const item = await generateAIItem(input);

      // 🧠 FIX: store consistente (cada item é um registro)
      const newItem = {
        id: Date.now(),
        ...item,
      };

      await save("shop", newItem);

      setItems((prev) => [newItem, ...prev]);
      setInput("");
      setMsg("Item forged!");
    } catch (e) {
      setMsg("Forge failed");
    }

    setLoading(false);
  }

  async function handleBuy(item: any) {
    try {
      await buyItem(item);
      setMsg("Purchased!");
      load();
    } catch (e: any) {
      setMsg(e.message || "Buy failed");
    }
  }

  const level = Math.floor((user?.xp || 0) / 100);

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold">🛒 Forge Market</h1>

      {/* USER INFO */}
      <div className="bg-slate-800 p-3 rounded text-sm flex justify-between">
        <span>💰 {user?.coins || 0}</span>
        <span>⭐ Level {level}</span>
        <span>🔥 {user?.streak || 0}</span>
      </div>

      {/* FORGE */}
      <div className="bg-slate-800 p-3 rounded">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your item..."
          className="w-full p-2 bg-slate-700 rounded"
        />

        <button
          onClick={forgeItem}
          disabled={loading}
          className="mt-2 w-full bg-purple-600 p-2 rounded"
        >
          {loading ? "Forging..." : "Forge Item"}
        </button>
      </div>

      {/* ITEMS */}
      {items.map((item) => {
        const lockedLevel =
          item.requiredLevel && level < item.requiredLevel;

        const lockedStreak =
          item.requiredStreak &&
          (user?.streak || 0) < item.requiredStreak;

        return (
          <div
            key={item.id}
            className="bg-slate-800 p-3 rounded space-y-1"
          >
            <h2 className="font-bold">
              {item.icon} {item.name}
            </h2>

            <p className="text-sm opacity-80">
              {item.description}
            </p>

            <p className="text-xs">💰 {item.price}</p>

            {item.requiredLevel && (
              <p className="text-xs">Level {item.requiredLevel}</p>
            )}

            {item.requiredStreak && (
              <p className="text-xs">🔥 {item.requiredStreak}</p>
            )}

            {(lockedLevel || lockedStreak) && (
              <p className="text-red-400 text-xs">Locked</p>
            )}

            {item.fake && (
              <p className="text-purple-400 text-xs">
                unstable energy detected...
              </p>
            )}

            <button
              disabled={lockedLevel || lockedStreak}
              onClick={() => handleBuy(item)}
              className="mt-2 w-full bg-blue-600 p-2 rounded disabled:bg-gray-500"
            >
              Buy
            </button>
          </div>
        );
      })}

      {msg && (
        <p className="text-center text-sm mt-2">{msg}</p>
      )}
    </div>
  );
}