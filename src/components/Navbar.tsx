"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getRecord } from "@/lib/db";
import {
  Home,
  BookOpen,
  Brain,
  Box,
  PlusSquare,
  ShoppingCart,
  Database, // Substituindo imagem por ícone de Vault
  Search,   // Substituindo imagem por ícone de SearchCode
  User,
  Flame,
  Coins
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
  const isSandboxUnlocked = level >= 50;

  const navLink = (href: string, Icon: any) => {
    const isActive = pathname === href;
    
    // Cores baseadas no Perfil Cognitivo
    const profileColors: any = {
      tdah: "text-purple-400 drop-shadow-[0_0_8px_rgba(192,38,211,0.8)]",
      Visual_Logic: "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]",
      Deep_Dive: "text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]",
      Standard: "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]"
    };

    const activeStyle = profileColors[user?.cognitive] || profileColors.Standard;

    return (
      <Link 
        href={href} 
        className={`transition-all duration-300 transform ${isActive ? `${activeStyle} scale-110` : "text-slate-500 hover:text-slate-300"}`}
      >
        <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
      </Link>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-xl border-t border-cyan-900/30 p-2 pb-safe z-50">
      
      {/* STATUS BAR (Glassmorphism sutil) */}
      <div className="flex justify-between text-[10px] mb-2 px-3 font-mono tracking-tighter">
        <div className="flex gap-4">
          <span className="flex items-center gap-1 text-orange-500">
            <Flame size={12} fill="currentColor" className="animate-pulse" /> {user?.streak || 0}
          </span>
          <span className="flex items-center gap-1 text-yellow-400">
            <Coins size={12} fill="currentColor" /> {user?.coins || 0}
          </span>
        </div>

        <div className="flex gap-2 items-center">
          <span className="text-slate-500 uppercase text-[9px]">
            {user?.cognitive?.replace("_", " ") || "Standard"}
          </span>
          <span className="bg-green-500/10 text-green-400 border border-green-500/30 px-1.5 rounded-sm">
            LV {level}
          </span>
        </div>
      </div>

      {/* LINKS PRINCIPAIS */}
      <div className="flex justify-around items-center max-w-md mx-auto">
        {navLink("/hub", Home)}
        {navLink("/course", BookOpen)}
        {navLink("/review", Brain)} 
        {navLink("/vault", Database)}  {/* Ícone vetorial para o Vault */}
        {navLink("/new", PlusSquare)} 
        {navLink("/shop", ShoppingCart)}
        {navLink("/profile", User)}
        {isSandboxUnlocked && navLink("/sandbox", <Box className="w-5 h-5 text-cyan-400" />)}
        <SoundButton />
      </div>

      {/* ENGINE CRITICAL WARNING */}
      {!user?.engineReady && (
        <div className="text-[8px] text-center text-red-500 mt-1.5 font-mono tracking-widest opacity-80 uppercase">
          [!] Neural link establishing...
        </div>
      )}
    </nav>
  );
}