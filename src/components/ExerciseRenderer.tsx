"use client";

import { useState, useEffect } from "react";
import { playSound } from "@/lib/sounds";
import { addXP } from "@/lib/economy";
import { updateLearningState } from "@/lib/learningState";
import { 
  CheckCircle2, XCircle, Zap, Terminal, Code2, Info, ChevronRight, Trophy
} from "lucide-react";

interface ExerciseProps {
  exercise: {
    id?: string;
    type: "mcq" | "code" | "ordering";
    question: string;
    codeSnippet?: string;
    options: string[];
    answer: string;
    explanation: string;
  };
  rarity?: "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
  onComplete?: (success: boolean) => void;
  onNext?: (correct: boolean) => Promise<void> | void; // Adicionado aqui para resolver o erro de build
}

export default function ExerciseRenderer({ exercise, rarity = "Common", onComplete, onNext }: ExerciseProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "checking" | "success" | "error">("idle");
  const [revealed, setRevealed] = useState(false);
  const [shake, setShake] = useState(false);
  const [glitchText, setGlitchText] = useState(exercise.question);
  const [reward, setReward] = useState<string | null>(null);

  const rarityConfig = {
    Common: { border: "border-slate-800", bg: "bg-slate-900/40", accent: "text-slate-500", glow: "" },
    Uncommon: { border: "border-green-900/50", bg: "bg-green-950/10", accent: "text-green-400", glow: "shadow-[0_0_15px_rgba(34,197,94,0.05)]" },
    Rare: { border: "border-blue-800/60", bg: "bg-blue-950/10", accent: "text-blue-400", glow: "shadow-[0_0_20px_rgba(59,130,246,0.1)]" },
    Epic: { border: "border-purple-700/60", bg: "bg-purple-950/15", accent: "text-purple-400", glow: "shadow-[0_0_25px_rgba(168,85,247,0.15)]" },
    Legendary: { border: "border-yellow-600/70", bg: "bg-yellow-950/20", accent: "text-yellow-400", glow: "shadow-[0_0_35px_rgba(234,179,8,0.25)]" }
  };

  const style = rarityConfig[rarity] || rarityConfig.Common;

  const handleCheck = async (option: string) => {
    if (status === "success" || status === "checking") return;
    setSelected(option);
    setStatus("checking");
    playSound("click", 0.2);
    
    await new Promise(r => setTimeout(r, 800));
    const isCorrect = option === exercise.answer;

    await updateLearningState(exercise.id || "general", isCorrect, rarity === "Legendary" ? 5 : 2);

    if (isCorrect) {
      setStatus("success");
      setRevealed(true);
      playSound("success", 0.5);
      const xpGained = rarity === "Legendary" ? 100 : rarity === "Epic" ? 50 : 25;
      setReward(`+${xpGained} XP_STABILIZED`);
      await addXP(xpGained);
      if (onComplete) onComplete(true);
      if (onNext) await onNext(true); // Chama a função que a Vercel estava reclamando
    } else {
      setStatus("error");
      setShake(true);
      playSound("error", 0.4);
      setTimeout(() => { setShake(false); setStatus("idle"); }, 1000);
      if (onComplete) onComplete(false);
      if (onNext) await onNext(false);
    }
  };

  useEffect(() => {
    setGlitchText(status === "success" ? "NEURAL_LINK_STABLE" : exercise.question);
  }, [status, exercise.question]);

  return (
    <div className={`relative w-full p-6 rounded-2xl border-2 transition-all duration-700 ${style.border} ${style.bg} ${style.glow} ${shake ? "animate-shake" : ""} ${status === "success" ? "border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.15)]" : ""}`}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl opacity-[0.03] z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      </div>

      <div className="relative z-10">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded bg-slate-900 border ${style.border}`}>
              <Terminal size={14} className={style.accent} />
            </div>
            <span className={`text-[10px] font-mono tracking-widest uppercase font-bold ${style.accent}`}>{rarity}_NODE_CHALLENGE</span>
          </div>
          {status === "success" && <div className="flex items-center gap-2 text-yellow-500 animate-bounce"><Trophy size={16} /> <span className="text-[10px] font-bold">COMPLETED</span></div>}
        </div>

        <div className="mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-slate-100 font-mono italic uppercase">
            <span className="text-cyan-500 mr-3 opacity-40">#</span>{glitchText}
          </h2>
        </div>

        {exercise.codeSnippet && (
          <div className="mb-8 relative group">
            <div className="relative bg-[#0d1117] p-5 rounded-lg border border-slate-800 font-mono text-sm overflow-x-auto shadow-2xl">
              <pre className="text-cyan-300/90"><code>{exercise.codeSnippet}</code></pre>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {exercise.options.map((option, idx) => (
            <button
              key={idx}
              onClick={() => handleCheck(option)}
              disabled={status === "success" || status === "checking"}
              className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all font-mono text-sm ${
                selected === option 
                  ? (status === "error" ? "border-red-500 bg-red-950/30" : "border-cyan-500 bg-cyan-950/30") 
                  : "border-slate-800 bg-slate-900/60"
              }`}
            >
              <span>{option}</span>
              {status === "success" && option === exercise.answer && <CheckCircle2 size={18} className="text-green-500" />}
            </button>
          ))}
        </div>

        {revealed && (
          <div className="mt-8 pt-6 border-t border-slate-800/50">
            <div className="bg-blue-950/10 rounded-xl border border-blue-900/30 p-5">
              <p className="text-sm text-slate-300 italic">{exercise.explanation}</p>
              {reward && <div className="mt-4 text-yellow-500 font-bold text-xs uppercase">{reward}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      </div>

      <div className="relative z-10">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded bg-slate-900 border ${style.border}`}>
              <Terminal size={14} className={style.accent} />
            </div>
            <span className={`text-[10px] font-mono tracking-[0.2em] uppercase font-bold ${style.accent}`}>
              {rarity}_NODE_CHALLENGE
            </span>
          </div>
          {status === "success" && (
            <div className="flex items-center gap-2 text-yellow-500 animate-bounce">
              <Trophy size={16} />
              <span className="text-[10px] font-bold">COMPLETED</span>
            </div>
          )}
        </div>

        {/* QUESTION AREA */}
        <div className="mb-8">
          <h2 className="text-xl md:text-2xl font-bold leading-tight text-slate-100 font-mono tracking-tight">
            <span className="text-cyan-500 mr-3 opacity-40">#</span>
            {glitchText}
          </h2>
        </div>

        {/* CODE SNIPPET */}
        {exercise.codeSnippet && (
          <div className="mb-8 relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative bg-[#0d1117] p-5 rounded-lg border border-slate-800 font-mono text-sm overflow-x-auto shadow-2xl">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500/50" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                  <div className="w-2 h-2 rounded-full bg-green-500/50" />
                  <span className="text-slate-500 text-[10px] ml-2">source_code.js</span>
                </div>
                <Code2 size={14} className="text-slate-600" />
              </div>
              <pre className="text-cyan-300/90 leading-relaxed">
                <code>{exercise.codeSnippet}</code>
              </pre>
            </div>
          </div>
        )}

        {/* OPTIONS LIST */}
        <div className="space-y-3">
          {exercise.options.map((option, idx) => {
            const isSelected = selected === option;
            const isCorrect = option === exercise.answer;
            
            let btnStyle = "border-slate-800 bg-slate-900/60 hover:border-slate-600 hover:bg-slate-800/80 text-slate-400";
            
            if (status === "success" && isCorrect) {
              btnStyle = "border-green-500 bg-green-950/30 text-green-200 shadow-[0_0_20px_rgba(34,197,94,0.2)]";
            } else if (isSelected && status === "error") {
              btnStyle = "border-red-500 bg-red-950/30 text-red-200";
            } else if (isSelected && status === "checking") {
              btnStyle = "border-cyan-500 bg-cyan-950/30 text-cyan-200 animate-pulse";
            } else if (isSelected) {
              btnStyle = "border-cyan-600 bg-cyan-950/20 text-cyan-100";
            }

            return (
              <button
                key={idx}
                onClick={() => handleCheck(option)}
                disabled={status === "success" || status === "checking"}
                className={`
                  w-full group relative flex items-center justify-between p-4 rounded-xl border-2 
                  text-left transition-all duration-300 font-mono text-sm
                  ${btnStyle}
                  disabled:cursor-default
                `}
              >
                <div className="flex items-center gap-4">
                  <span className={`text-[10px] font-bold ${isSelected ? 'text-cyan-400' : 'text-slate-600'}`}>
                    0{idx + 1}
                  </span>
                  <span className="leading-snug">{option}</span>
                </div>
                
                <div className="flex items-center">
                  {status === "success" && isCorrect && <CheckCircle2 size={18} className="text-green-500 animate-in zoom-in" />}
                  {isSelected && status === "error" && <XCircle size={18} className="text-red-500 animate-in shake-in" />}
                  {status === "idle" && (
                    <ChevronRight size={16} className="text-slate-700 group-hover:text-cyan-500 transition-colors" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* FEEDBACK EXPLANATION */}
        {revealed && (
          <div className="mt-8 pt-6 border-t border-slate-800/50 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-blue-950/10 rounded-xl border border-blue-900/30 p-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-10">
                <Info size={48} className="text-blue-400" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2 text-blue-400">
                  <Target size={16} />
                  <span className="text-xs font-black uppercase tracking-widest">Neural_Analysis</span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed italic">
                  {exercise.explanation}
                </p>
                {reward && (
                  <div className="mt-4 flex items-center gap-2 text-yellow-500 font-bold text-xs bg-yellow-500/10 w-fit px-3 py-1 rounded-full border border-yellow-500/20">
                    <Zap size={12} fill="currentColor" />
                    {reward}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
