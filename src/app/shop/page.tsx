"use client";

import { useEffect, useState } from "react";
import { baseItems } from "@/lib/shopItems";
import { generateAIItem } from "@/lib/aiShop";
import { buyItem } from "@/lib/economy";
import { get, save } from "@/lib/db";

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
    const generated = (await get("shop", "generated")) || [];

    setUser(u);
    setItems([...generated, ...baseItems]);
  }

  async function forgeItem() {
    if (!input) return;

    setLoading(true);

    const item = await generateAIItem(input);

    const existing = (await get("shop", "generated")) || [];
    const updated = [item, ...existing];

    await save("shop", updated);

    setItems((prev) => [item, ...prev]);

    setInput("");
    setLoading(false);
  }

  async function handleBuy(item: any) {
    try {
      await buyItem(item);
      setMsg("Purchased!");
    } catch (e: any) {
      setMsg(e.message);
    }
  }

  const level = Math.floor((user?.xp || 0) / 100);

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl mb-3">Forge Market</h1>

      <div className="bg-slate-800 p-3 rounded mb-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your item..."
          className="w-full p-2 bg-slate-700 rounded"
        />

        <button
          onClick={forgeItem}
          className="mt-2 w-full bg-purple-600 p-2 rounded"
        >
          {loading ? "Forging..." : "Forge"}
        </button>
      </div>

      {items.map((item) => {
        const lockedLevel =
          item.requiredLevel && level < item.requiredLevel;

        const lockedStreak =
          item.requiredStreak &&
          (user?.streak || 0) < item.requiredStreak;

        return (
          <div
            key={item.id}
            className="bg-slate-800 p-3 mb-3 rounded"
          >
            <h2>
              {item.icon} {item.name}
            </h2>

            <p className="text-sm">{item.description}</p>

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
                unstable energy...
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

      {msg && <p className="mt-3">{msg}</p>}
    </div>
  );
}