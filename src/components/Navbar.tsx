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
  const [cognitive, setCognitive] = useState("Standard");
  const [coins, setCoins] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(0);
  const [activeCourse, setActiveCourse] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);


  useEffect(() => {
    load();

    // 🔁 auto refresh (important for reactivity)
    const interval = setInterval(load, 1500);

    return () => clearInterval(interval);
  }, []);

  async function load() {
    const user = await get("user", "main");

    if (!user) return;

    // ✅ FIX: correct source of coins
    setCoins(user?.coins || 0);

    setStreak(user?.streak || 0);

    // ✅ LEVEL SYSTEM
    const lvl = Math.floor((user?.xp || 0) / 100);
    setLevel(lvl);

    // ✅ ACTIVE COURSE
    setActiveCourse(user?.activeCourse || null);



    // ✅ LOCK STATE
    setLocked(!user?.engineReady);

    setCognitive(user?.cognitive || "Standard");

    setLocked(!user?.engineReady);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 p-2">

      {/* STATUS BAR */}
      <div className="flex justify-between text-xs mb-1 px-2">

        {/* 🔥 STREAK */}
        <span className="flex items-center gap-1 text-orange-400">
          <Flame size={14} /> {streak}
        </span>

        {/* 💰 COINS */}
        <span className="flex items-center gap-1 text-yellow-400">
          <Coins size={14} /> {coins}
        </span>

        {/* ⭐ LEVEL */}
        <span className="text-green-400">
          Lv {level}
        </span>
      </div>

      {/* ACTIVE COURSE INDICATOR */}
      {activeCourse && (
        <div className="text-[10px] text-center text-blue-400">
          📘 {activeCourse} • 🧠 {cognitive}
        </div>
      )}

      {/* NAV */}
      <div className="flex justify-around text-xs">

        <Link href="/hub">
          <Home />
        </Link>

        <Link href="/course">
          <BookOpen />
        </Link>

        <Link href="/new">
          <Brain />
        </Link>

        <Link href="/shop">
          <ShoppingCart />
        </Link>

        <Link href="/vault">
          <Vault />
        </Link>

        <Link href="/profile">
          <User />
        </Link>
      </div>

      {/* 🔒 LOCK WARNING */}
      {locked && (
        <div className="text-[10px] text-center text-red-400 mt-1">
          🔒 AI Engine not initialized
        </div>
      )}
    </div>
  );
}