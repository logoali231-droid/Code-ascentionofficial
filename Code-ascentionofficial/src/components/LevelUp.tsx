"use client";

export default function LevelUp({ level }: { level: number }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
      <div className="bg-slate-800 p-6 rounded-xl text-center animate-bounce">
        <h1 className="text-2xl font-bold text-green-400">
          LEVEL UP!
        </h1>
        <p className="mt-2">Level {level}</p>
      </div>
    </div>
  );
}