"use client";
import { useEffect } from "react";
import { playSound } from "@/lib/others/sounds";

export default function LevelUp({
  level,
  onClose,
}: {
  level: number;
  onClose?: () => void;
}) {
  useEffect(() => {
    playSound("level-up", 0.6);
    const timer = setTimeout(() => onClose?.(), 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-200 animate-in fade-in duration-500">
      <div className="bg-slate-900 border-2 border-cyan-500 p-8 rounded-3xl text-center shadow-[0_0_50px_rgba(6,182,212,0.3)] animate-bounce">
        <div className="text-cyan-500 mb-2 font-black tracking-[0.2em] text-xs uppercase">
          Neural_Upgrade_Complete
        </div>
        <h1 className="text-5xl font-black text-white italic tracking-tighter mb-2">
          LEVEL <span className="text-cyan-400">{level}</span>
        </h1>
        <p className="text-slate-400 font-mono text-sm uppercase">
          Cognitive capacity expanded.
        </p>
      </div>
    </div>
  );
}
