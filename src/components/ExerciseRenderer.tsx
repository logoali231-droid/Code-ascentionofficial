"use client";

import { useState, useEffect, useRef } from "react";
import { playSound } from "@/lib/sounds";
import { addXP } from "@/lib/economy";
import { CheckCircle2, XCircle, Zap, Shield, Target, Terminal, Code2 } from "lucide-react";

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
}

export default function ExerciseRenderer({ exercise, rarity = "Common", onComplete }: ExerciseProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "checking" | "success" | "error">("idle");
  const [revealed, setRevealed] = useState(false);
  const [shake, setShake] = useState(false);
  const [glitchText, setGlitchText] = useState(exercise.question);

  // Efeito visual de Raridade
  const rarityConfig = {
    Common: { border: "border-slate-700", bg: "bg-slate-900/50", accent: "text-slate-400", glow: "shadow-none" },
    Uncommon: { border: "border-green-800", bg: "bg-green-950/20", accent: "text-green-400", glow: "shadow-[0_0_15px_rgba(34,197,94,0.1)]" },
    Rare: { border: "border-blue-700", bg: "bg-blue-950/20", accent: "text-blue-400", glow: "shadow-[0_0_20px_rgba(59,130,246,0.15)]" },
    Epic: { border: "border-purple-600", bg: "bg-purple-950/20", accent: "text-purple-400", glow: "shadow-[0_0_25px_rgba(168,85,247,0.2)]" },
    Legendary: { border: "border-yellow-500", bg: "bg-yellow-950/30", accent: "text-yellow-400", glow: "shadow-[0_0_35px_rgba(234,179,8,0.3)]" }
  };

  const style = rarityConfig[rarity];

  const handleCheck = async (option: string) => {
    if (status === "success" || status === "checking") return;

    setSelected(option);
    setStatus("checking");
    
    // Pequeno delay para "simular" processamento neural
    await new Promise(r => setTimeout(r, 600));

    if (option === exercise.answer) {
      setStatus("success");
      setRevealed(true);
      playSound("success", 0.5);
      await addXP(rarity === "Legendary" ? 50 : 20);
      if (onComplete) onComplete(true);
    } else {
      setStatus("error");
      setShake(true);
      playSound("error", 0.4);
      setTimeout(() => setShake(false), 500);
      // Mantém status error por um tempo antes de permitir nova tentativa
      setTimeout(() => setStatus("idle"), 1000);
      if (onComplete) onComplete(false);
    }
  };

  // Efeito de "Digitando" Cyberpunk no título
  useEffect(() => {
    if (status === "success") {
      setGlitchText("CORE_SEQUENCE_VALIDATED");
    }
  }, [status]);

  return (
    <div className={`
      relative w-full p-6 rounded-xl border-2 transition-all duration-500
      ${style.border} ${style.bg} ${style.glow}
      ${shake ? "animate-shake" : ""}
      ${status === "success" ? "border-green-500 ring-1 ring-green-500" : ""}
    `}>
      
      {/* HEADER DO EXERCÍCIO */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-2">
          <Terminal size={18} className={style.accent} />
          <span className={`text-[10px] font-mono tracking-widest uppercase ${style.accent}`}>
            {rarity} Node Input
          </span>
        </div>
        {status === "success" && <Zap size={18} className="text-yellow-400 animate-pulse" />}
      </div>

      {/* QUESTÃO */}
      <div className="mb-6">
        <h2 className="text-lg md:text-xl font-bold leading-tight text-slate-100 font-mono">
          <span className="text-cyan-500 mr-2 opacity-50">{">"}</span>
          {glitchText}
        </h2>
      </div>

      {/* SNIPPET DE CÓDIGO (OPCIONAL) */}
      {exercise.codeSnippet && (
        <div className="mb-6 bg-black/60 p-4 rounded border border-slate-800 font-mono text-sm overflow-x-auto">
          <div className="flex items-center gap-2 mb-2 border-b border-slate-800 pb-2">
            <Code2 size={14} className="text-slate-500" />
            <span className="text-slate-500 text-[10px]">main.js</span>
          </div>
          <pre className="text-cyan-300">
            <code>{exercise.codeSnippet}</code>
          </pre>
        </div>
      )}

      {/* OPÇÕES (MCQ) */}
      <div className="grid gap-3">
        {exercise.options.map((option, idx) => {
          const isSelected = selected === option;
          const isCorrect = option === exercise.answer;
          
          let btnClass = "border-slate-800 bg-slate-900/50 hover:border-slate-600 hover:bg-slate-800";
          if (status === "success" && isCorrect) btnClass = "border-green-500 bg-green-950/30 text-green-200 shadow-[0_0_15px_rgba(34,197,94,0.2)]";
          if (isSelected && status === "error") btnClass = "border-red-500 bg-red-950/30 text-red-200";
          if (isSelected && status === "checking") btnClass = "border-cyan-500 animate-pulse bg-cyan-950/20";

          return (
            <button
              key={idx}
              onClick={() => handleCheck(option)}
              disabled={status === "success" || status === "checking"}
              className={`
                group relative flex items-center justify-between p-4 rounded-lg border-2 
                text-left transition-all duration-200 font-mono text-sm
                ${btnClass}
                disabled:cursor-default
              `}
            >
              <div className="flex items-center gap-3">
                <span className="text-xs opacity-30">{String.fromCharCode(65 + idx)}|</span>
                {option}
              </div>
              
              {status === "success" && isCorrect && <CheckCircle2 size={16} className="text-green-500" />}
              {isSelected && status === "error" && <XCircle size={16} className="text-red-500" />}
            </button>
          );
        })}
      </div>

      {/* FOOTER: EXPLICAÇÃO / FEEDBACK */}
      {revealed && (
        <div className="mt-8 pt-6 border-t border-slate-800 animate-in fade-in slide-in-from-top-2 duration-700">
          <div className="flex items-start gap-3 bg-blue-950/20 p-4 rounded border border-blue-900/50">
            <Target className="text-blue-400 mt-1 flex-shrink-0" size={18} />
            <div>
              <p className="text-xs uppercase font-bold text-blue-400 mb-1 tracking-tighter">Neural Insight:</p>
              <p className="text-sm text-slate-300 leading-relaxed italic">
                {exercise.explanation}
              </p>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <div className="text-[10px] font-mono text-slate-500 flex items-center gap-2">
              <Shield size={12} />
              ENCRYPTION_STABLE // SYSTEM_SYNC_COMPLETE
            </div>
          </div>
        </div>
      )}

      {/* LAYER DE DECORAÇÃO CYBERPUNK (SCANLINES) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl opacity-[0.03]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      </div>
    </div>
  );
}
      {/* SECONDARY (hidden in ADHD) */}
      <div className="secondary text-xs text-slate-400">
        Type: {exercise.type}
      </div>

      {/* MCQ */}
      {exercise.type === "mcq" &&
        exercise.options?.map((o: string) => (
          <button
            key={o}
            onClick={() => {
              playSound("click", cognitive);
              setAnswer(o);
            }}
            className={`block w-full mt-2 p-2 rounded ${
              answer === o ? "bg-blue-600" : "bg-slate-700"
            }`}
          >
            {o}
          </button>
        ))}

      {/* SHORT */}
      {exercise.type === "short" && (
        <input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className="w-full p-2 rounded bg-slate-700 mt-2"
          placeholder="Type your answer..."
        />
      )}

      {/* CODE */}
      {exercise.type === "code" && (
        <div className="mt-2">
          <CodeEditor onChange={setAnswer} />
        </div>
      )}

      {/* ADVANCED (Deep Dive only) */}
      <div className="collapsed hidden text-xs text-slate-400 mt-2">
        💡 Hint: Think step-by-step before answering.
      </div>

      {/* SUBMIT */}
      <button
        onClick={submit}
        disabled={loading}
        className="mt-4 w-full bg-blue-600 p-2 rounded"
      >
        {loading ? "Checking..." : "Submit"}
      </button>

      {/* FEEDBACK */}
      {feedback !== null && (
        <div
          className={`absolute inset-0 flex items-center justify-center text-3xl font-bold rounded-xl ${
            feedback ? "bg-green-500/80" : "bg-red-500/80"
          }`}
        >
          {feedback ? "✔" : "✖"}
        </div>
      )}

      {/* REWARD */}
      <RewardPopup show={!!reward} text={reward} />
    </div>
  );
}
