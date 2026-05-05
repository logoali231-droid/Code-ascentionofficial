"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { get } from "@/lib/db";
import {
  Home,
  BookOpen,
  Brain,
  ShoppingCart,
  Vault,
  User,
  Flame,
  Coins
} from "lucide-react";

export default function Navbar() {
  const [coins, setCoins] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const econ = await get("economy", "main");
    const user = await get("user", "main");

    setCoins(econ?.coins || 0);
    setStreak(user?.streak || 0);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 p-2">

      {/* STATUS BAR */}
      <div className="flex justify-between text-xs mb-1 px-2">
        <span className="flex items-center gap-1 text-orange-400">
          <Flame size={14} /> {streak}
        </span>

        <span className="flex items-center gap-1 text-yellow-400">
          <Coins size={14} /> {coins}
        </span>
      </div>

      {/* NAV */}
      <div className="flex justify-around text-xs">
        <Link href="/hub"><Home /></Link>
        <Link href="/course"><BookOpen /></Link>
        <Link href="/new"><Brain /></Link>
        <Link href="/shop"><ShoppingCart /></Link>
        <Link href="/vault"><Vault /></Link>
        <Link href="/profile"><User /></Link>
      </div>
    </div>
  );
}