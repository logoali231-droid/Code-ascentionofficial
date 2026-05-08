"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getRecord } from "@/lib/db";
import {
  Home,
  BookOpen,
  Brain, // Este agora será o MIND PALACE (Review)
  PlusSquare, // Usaremos este para "New Course"
  ShoppingCart,
  Vault,
  User,
  Flame,
  Coins,
  SearchCode // Ícone temático para revisão
} from "lucide-react";
import SoundButton from "./SoundButton";

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  async function load() {
    const data = await getRecord("user");
    if (data) setUser(data);
  }

  const level = Math.max(1, Math.floor((user?.xp || 0) / 100));

  const navLink = (href: string, Icon: any) => {
    const isActive = pathname === href;
    const profileColors: any = {
      tdah: "text-purple-400",
      Visual_Logic: "text-yellow-400",
      Deep_Dive: "text-blue-500",
      Standard: "text-cyan-400"
    };

    const activeColor = profileColors[user?.cognitive] || "text-cyan-400";

    return (
      <Link href={href} className={`transition-all ${isActive ? activeColor : "text-slate-500"}`}>
        <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
      </Link>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-t border-slate-700 p-2 z-50">
      
      {/* STATUS BAR */}
      <div className="flex justify-between text-[10px] mb-2 px-2 font-mono">
        <div className="flex gap-3">
          <span className="flex items-center gap-1 text-orange-400">
            <Flame size={12} fill="currentColor" /> {user?.streak || 0}
          </span>
          <span className="flex items-center gap-1 text-yellow-400">
            <Coins size={12} fill="currentColor" /> {user?.coins || 0}
          </span>
        </div>

        <div className="flex gap-2 items-center">
          <span className="text-slate-500 italic uppercase">
            {user?.cognitive || "Standard"}
          </span>
          <span className="text-green-400 border border-green-900 px-1 rounded">
            LV {level}
          </span>
        </div>
      </div>

      {/* LINKS PRINCIPAIS */}
      <div className="flex justify-around items-center">
        {navLink("/hub", Home)}
        {navLink("/course", BookOpen)}
        {navLink("/review", Brain)} {/* MIND PALACE - REVISÃO */}
        {navLink("/new", PlusSquare)} 
        {navLink("/shop", ShoppingCart)}
        {navLink("/profile", User)}
        <SoundButton />
      </div>

      {/* AI STATUS WARNING */}
      {!user?.engineReady && (
        <div className="text-[9px] text-center text-red-500 mt-1 animate-pulse font-bold">
          ⚠ NEURAL ENGINE OFFLINE
        </div>
      )}
    </div>
  );
}