"use client";

import { useState } from "react";
import { generateItem } from "@/lib/marketAI";
import { save } from "@/lib/db";
import { spendCoins } from "@/lib/economy";

export default function Shop() {
  const [prompt, setPrompt] = useState("");
  const [item, setItem] = useState<any>(null);

  async function generate() {
    const i = await generateItem(prompt);
    setItem(i);
  }

  async function buy() {
    if (!item) return;

    const ok = await spendCoins(item.price);

    if (!ok) return alert("Not enough coins");

    await save("inventory", {
      id: Date.now(),
      ...item,
    });

    alert("Item acquired");
  }
return (
  <div className="p-4 pb-24">
    <h1 className="text-xl font-bold mb-4">Vault</h1>

    <div className="grid grid-cols-2 gap-3">
      {items.map((i) => (
        <div key={i.id} className="bg-slate-800 p-3 rounded-xl">
          <h3 className="font-semibold text-sm">{i.name}</h3>
          <p className="text-xs text-slate-400">{i.description}</p>
        </div>
      ))}
    </div>
  </div>
);
}