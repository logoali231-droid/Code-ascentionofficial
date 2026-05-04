"use client";

import { useEffect, useState } from "react";
import { getAll } from "@/lib/db";

export default function Vault() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    getAll("inventory").then(setItems);
  }, []);

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