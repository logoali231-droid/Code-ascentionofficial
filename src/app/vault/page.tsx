"use client";

import { useEffect, useState } from "react";
import { get } from "@/lib/db";

export default function VaultPage() {
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const user = await get("user", "main");
    setItems(user?.inventory || []);
  }

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl mb-4">Vault</h1>

      <div className="grid grid-cols-3 gap-3">
        {items.map((item, i) => (
          <div
            key={i}
            onClick={() => setSelected(item)}
            className="bg-slate-800 rounded-xl p-3 flex items-center justify-center text-2xl cursor-pointer hover:scale-105 transition"
          >
            {item.icon}
          </div>
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-slate-900 p-6 rounded-xl max-w-xs w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-4xl mb-2 text-center">
              {selected.icon}
            </div>

            <h2 className="text-center">{selected.name}</h2>
            <p className="text-sm text-center mb-2">
              {selected.description}
            </p>

            {selected.fake && (
              <p className="text-purple-400 text-xs text-center">
                unstable artifact...
              </p>
            )}

            <button
              onClick={() => setSelected(null)}
              className="mt-3 w-full bg-blue-600 p-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}