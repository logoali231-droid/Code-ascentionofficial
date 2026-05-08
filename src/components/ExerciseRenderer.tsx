"use client";
import { useState, useEffect } from "react";
import { playSound } from "@/lib/sounds";
import { addXP } from "@/lib/economy";
import { updateLearningState } from "@/lib/learningState";
import { CheckCircle2, XCircle, Zap, Terminal, Info, Trophy } from "lucide-react";

interface ExerciseProps {
  exercise: { id?: string; question: string; options: string[]; answer: string; explanation: string; codeSnippet?: string; };
  rarity?: string;
  onComplete?: (s: boolean) => void;
  onNext?: (c: boolean) => Promise<void> | void;
}

export default function ExerciseRenderer({ exercise, rarity = "Common", onComplete, onNext }: ExerciseProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "checking" | "success" | "error">("idle");
  const [revealed, setRevealed] = useState(false);

  const handleCheck = async (opt: string) => {
    if (status === "success" || status === "checking") return;
    setSelected(opt); setStatus("checking"); playSound("click", 0.2);
    await new Promise(r => setTimeout(r, 800));
    const isCorrect = opt === exercise.answer;
    await updateLearningState(exercise.id || "gen", isCorrect, 2);
    if (isCorrect) {
      setStatus("success"); setRevealed(true); playSound("success", 0.5);
      await addXP(25); if (onComplete) onComplete(true); if (onNext) await onNext(true);
    } else {
      setStatus("error"); playSound("error", 0.4);
      setTimeout(() => setStatus("idle"), 1000);
      if (onComplete) onComplete(false); if (onNext) await onNext(false);
    }
  };

  return (
    <div className={`p-6 rounded-2xl border-2 bg-slate-900/40 ${status === "success" ? "border-green-500" : "border-slate-800"}`}>
      <div className="flex justify-between mb-6">
        <div className="flex items-center gap-2"><Terminal size={14} /> <span className="text-[10px] font-bold">{rarity}_NODE</span></div>
        {status === "success" && <Trophy size={16} className="text-yellow-500 animate-bounce" />}
      </div>
      <h2 className="text-xl font-bold mb-6 text-slate-100 italic uppercase">{exercise.question}</h2>
      {exercise.codeSnippet && <pre className="bg-black/50 p-4 rounded-lg mb-6 text-cyan-300 text-xs overflow-x-auto"><code>{exercise.codeSnippet}</code></pre>}
      <div className="space-y-3">
        {exercise.options.map((opt, i) => (
          <button key={i} onClick={() => handleCheck(opt)} disabled={status!=="idle"} className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selected === opt ? (status === "error" ? "border-red-500 bg-red-950/20" : "border-cyan-500") : "border-slate-800"}`}>
            <div className="flex justify-between items-center">
              <span>{opt}</span>
              {status === "success" && opt === exercise.answer && <CheckCircle2 size={18} className="text-green-500" />}
            </div>
          </button>
        ))}
      </div>
      {revealed && (
        <div className="mt-8 p-5 bg-blue-950/10 border border-blue-900/30 rounded-xl">
          <p className="text-sm text-slate-300 italic">{exercise.explanation}</p>
        </div>
      )}
    </div>
  );
}
