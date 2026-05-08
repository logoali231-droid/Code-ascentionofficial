"use client";
import { useState } from "react";
import { playSound } from "@/lib/sounds";
import { addXP } from "@/lib/economy";
import { updateLearningState } from "@/lib/learningState";
import { CheckCircle2, Terminal, Trophy } from "lucide-react";

interface ExerciseProps {
  // Usando a estrutura exata que o seu course:page.tsx envia
  exercise: { 
    id?: string; 
    question: string; 
    options: string[]; 
    answer: string; 
    explanation: string; 
    codeSnippet?: string; 
  };
  rarity?: string;
  onComplete?: (s: boolean) => void;
  onNext?: (c: boolean) => Promise<void> | void;
  course?: any; // ✅ CRUCIAL: Resolve o erro de compilação da Vercel
}

export default function ExerciseRenderer({ 
  exercise, 
  rarity = "Common", 
  onComplete, 
  onNext,
  course // Recebendo a prop para evitar erro de 'not assignable'
}: ExerciseProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "checking" | "success" | "error">("idle");
  const [revealed, setRevealed] = useState(false);

  const handleCheck = async (opt: string) => {
    if (status === "success" || status === "checking") return;
    
    setSelected(opt); 
    setStatus("checking"); 
    playSound("click", 0.2);
    
    // Pequeno delay para simular "processamento neural"
    await new Promise(r => setTimeout(r, 800));
    
    const isCorrect = opt === exercise.answer;
    
    // Atualiza o estado de aprendizado no IndexedDB
    await updateLearningState(exercise.id || "gen", isCorrect, 2);

    if (isCorrect) {
      setStatus("success"); 
      setRevealed(true); 
      playSound("success", 0.5);
      await addXP(25); 
      
      if (onComplete) onComplete(true); 
      // Avança para o próximo exercício
      if (onNext) await onNext(true);
    } else {
      setStatus("error"); 
      playSound("error", 0.4);
      
      // Reseta o status para permitir nova tentativa após 1s
      setTimeout(() => setStatus("idle"), 1000);
      
      if (onComplete) onComplete(false);
      // Opcional: descomente a linha abaixo se quiser pular mesmo errando
      // if (onNext) await onNext(false);
    }
  };

  return (
    <div className={`p-6 rounded-2xl border-2 bg-slate-900/40 transition-all duration-300 ${
      status === "success" ? "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]" : "border-slate-800"
    }`}>
      <div className="flex justify-between mb-6">
        <div className="flex items-center gap-2 text-slate-500">
          <Terminal size={14} className="text-cyan-500" /> 
          <span className="text-[10px] font-bold tracking-widest uppercase">
            {course?.topic ? `${course.topic}_${rarity}` : `${rarity}_NODE`}
          </span>
        </div>
        {status === "success" && <Trophy size={16} className="text-yellow-500 animate-bounce" />}
      </div>

      <h2 className="text-xl font-bold mb-6 text-slate-100 italic uppercase leading-tight">
        {exercise.question}
      </h2>

      {exercise.codeSnippet && (
        <pre className="bg-black/50 p-4 rounded-lg mb-6 text-cyan-300 text-xs overflow-x-auto border border-slate-800/50">
          <code>{exercise.codeSnippet}</code>
        </pre>
      )}

      <div className="space-y-3">
        {exercise.options.map((opt, i) => (
          <button 
            key={i} 
            onClick={() => handleCheck(opt)} 
            disabled={status !== "idle" && status !== "error"}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
              selected === opt 
                ? (status === "error" ? "border-red-500 bg-red-950/20" : "border-cyan-500 bg-cyan-950/10") 
                : "border-slate-800 hover:border-slate-700 bg-slate-900/20"
            }`}
          >
            <div className="flex justify-between items-center">
              <span className={selected === opt ? "text-white" : "text-slate-400"}>{opt}</span>
              {status === "success" && opt === exercise.answer && <CheckCircle2 size={18} className="text-green-500" />}
            </div>
          </button>
        ))}
      </div>

      {revealed && (
        <div className="mt-8 p-5 bg-cyan-950/10 border border-cyan-900/30 rounded-xl animate-in fade-in duration-500">
          <p className="text-[10px] font-black text-cyan-500 uppercase mb-2 tracking-tighter italic">Analysis_Result:</p>
          <p className="text-sm text-slate-300 italic leading-relaxed">{exercise.explanation}</p>
        </div>
      )}
    </div>
  );
}