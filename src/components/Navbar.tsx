"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { get } from "@/lib/db";
import { calculateLevel } from "@/lib/level";
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
import SoundButton from "./SoundButton";

export default function Navbar() {
  const pathname = usePathname();
  const [userData, setUserData] = useState<{
    coins: number;
    streak: number;
    xp: number;
    activeCourse: string | null;
    cognitive: string;
    engineReady: boolean;
  } | null>(null);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000); // Refresh mais rápido para melhor feedback
    return () => clearInterval(interval);
  }, []);

  async function load() {
    const user = await get("user", "main");
    if (user) {
      setUserData(user);
    }
  }

  const level = calculateLevel(userData?.xp || 0);

  // Helper para estilizar links ativos
  const navLink = (href: string, Icon: any) => {
    const isActive = pathname === href;
    return (
      <Link href={href} className={`transition-colors ${isActive ? "text-cyan-400" : "text-slate-400 hover:text-white"}`}>
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
      </Link>
    );
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 p-2 z-50">
        
        {/* STATUS BAR SUPERIOR */}
        <div className="flex justify-between items-center text-[10px] mb-2 px-4 font-mono tracking-tighter">
          <div className="flex gap-3">
            <span className="flex items-center gap-1 text-orange-500">
              <Flame size={12} fill="currentColor" /> {userData?.streak || 0}
            </span>
            <span className="flex items-center gap-1 text-yellow-500">
              <Coins size={12} fill="currentColor" /> {userData?.coins || 0}
            </span>
          </div>
          
          <div className="flex gap-3 items-center">
            {userData?.activeCourse && (
              <span className="text-blue-400 truncate max-w-[100px]">
                {userData.activeCourse}
              </span>
            )}
            <span className="bg-slate-800 px-2 py-0.5 rounded text-green-400 border border-green-900/50">
              LV {level}
            </span>
          </div>
        </div>

        {/* NAV PRINCIPAL */}
        <div className="flex justify-around items-center pb-1">
          {navLink("/hub", Home)}
          {navLink("/course", BookOpen)}
          {navLink("/new", Brain)}
          {navLink("/shop", ShoppingCart)}
          {navLink("/vault", Vault)}
          {navLink("/profile", User)}
          <SoundButton />
        </div>

        {/* ALERTA DE ENGINE */}
        {!userData?.engineReady && (
          <div className="text-[8px] text-center text-red-500/70 animate-pulse uppercase tracking-widest mt-1">
            Core Engine Offline
          </div>
        )}
      </div>
    </>
  );
}        </Link>

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
