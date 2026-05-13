"use client";
import { useEffect, useState } from "react";
import { playSound } from "@/lib/sounds";
import { addXP } from "@/lib/updateUser";
import { updateLearningState } from "@/lib/learningState";
import { CheckCircle2, Loader2, Terminal, Trophy } from "lucide-react";
import CodeEditor from "./CodeEditor";
import { evaluateLogic } from "@/lib/evaluator.logic";

interface ExerciseProps {
  exercise?: any;
  rarity?: string;
  course?: any;
  loading?: boolean;
  streamIndex?: number;
  streamTotal?: number;
  isStreaming?: boolean; // ADICIONADO PARA CORRIGIR O ERRO
  streamProgress?: number; // ADICIONADO PARA CORRIGIR O ERRO
  onComplete?: (success: boolean) => void;
  onNext?: (success: boolean, userResponse?: string) => Promise<void> | void;
}

export default function ExerciseRenderer({ exercise: rawExercise, ...props }: ExerciseProps) {
  // Objeto 'safe' com fallbacks. O 'as Exercise' garante que o TS aceite a mesclagem.
  const exercise: Exercise = {
    id: rawExercise?.id || "gen_" + Date.now(),
    type: (rawExercise?.type as any) || "code",
    language: rawExercise?.language || "javascript",
    question: rawExercise?.question || "Analyze the code pattern:",
    answer: rawExercise?.answer || "",
    ...rawExercise
  } as Exercise; // <--- Agora
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "checking" | "success" | "error">("idle");
  const [revealed, setRevealed] = useState(false);
  const [codeAnswer, setCodeAnswer] = useState("");
  const [availableHeight, setAvailableHeight] = useState("100vh");

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) setAvailableHeight(`${window.visualViewport.height}px`);
    };
    window.visualViewport?.addEventListener("resize", handleResize);
    handleResize();
    return () => window.visualViewport?.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setSelected(null); setStatus("idle"); setRevealed(false);
    setCodeAnswer(exercise?.starterCode || "");
  }, [exercise?.id]);

  if (loading || !exercise) return (
    <div className="p-6 rounded-2xl border-2 border-cyan-900/30 bg-slate-900/40 animate-pulse h-64 flex flex-col justify-center items-center">
      <Loader2 className="animate-spin text-cyan-500 mb-2" size={24} />
      <span className="text-[10px] font-black uppercase tracking-widest text-cyan-500">Initializing_Neural_Link...</span>
    </div>
  );

  const handleValidation = async (value: string) => {
    if (status === "checking" || status === "success") return;
    setStatus("checking"); playSound("click", 0.2);
    await new Promise((r) => setTimeout(r, 450));
    const isCorrect = await evaluateLogic(value, exercise.answer || "");
    await updateLearningState(exercise.id || "generated", isCorrect, 2);
    if (isCorrect) {
      setStatus("success"); setRevealed(true); playSound("success", 0.5);
      await addXP(25); onComplete?.(true);
      if (onNext) await onNext(true, value);
    } else {
      setStatus("error"); playSound("error", 0.4);
      setTimeout(() => setStatus("idle"), 1000);
      onComplete?.(false);
    }
  };

  return (
    <div style={{ height: `calc(${availableHeight} - 1rem)` }}
      className={`flex flex-col rounded-2xl border-2 bg-slate-900/90 transition-all duration-300 overflow-hidden relative ${
        status === "success" ? "border-green-500 shadow-lg" : "border-slate-800"
      }`}>
      <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 z-20">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-cyan-500" />
          <span className="text-[10px] font-bold tracking-widest uppercase text-slate-500">
            {course?.topic ? `${course.topic}_${rarity}` : `${rarity}_NODE`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isStreaming && <span className="text-[10px] text-cyan-500 animate-pulse">SYNCING_{streamProgress}%</span>}
          {streamTotal > 0 && <span className="text-[10px] text-slate-600 font-black">{streamIndex}/{streamTotal}</span>}
          {status === "success" && <Trophy size={16} className="text-yellow-500 animate-bounce" />}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 relative custom-scrollbar z-10">
        <h2 className="text-xl font-bold mb-4 text-slate-100 italic uppercase leading-tight">{exercise.question}</h2>
        {exercise.codeSnippet && (
          <pre className="bg-black/60 p-4 rounded-lg mb-6 text-cyan-300 text-xs border border-cyan-500/20 overflow-x-auto">
            <code>{exercise.codeSnippet}</code>
          </pre>
        )}

        {exercise.type === "code" ? (
          <CodeEditor language={exercise.language || "plaintext"} initialValue={codeAnswer} onChange={setCodeAnswer} />
        ) : (
          <div className="space-y-3">
            {exercise.options?.map((opt: string, i: number) => (
              <button key={i} onClick={() => { setSelected(opt); handleValidation(opt); }}
                disabled={status !== "idle" && status !== "error"}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  selected === opt ? (status === "error" ? "border-red-500 bg-red-950/20" : "border-cyan-500 bg-cyan-950/10") : "border-slate-800 bg-slate-900/40"
                }`}>
                <div className="flex justify-between items-center">
                  <span className={selected === opt ? "text-white" : "text-slate-400"}>{opt}</span>
                  {status === "success" && opt === exercise.answer && <CheckCircle2 size={18} className="text-green-500" />}
                </div>
              </button>
            ))}
          </div>
        )}

        {revealed && (
          <div className="mt-6 p-4 bg-cyan-950/20 border border-cyan-500/30 rounded-xl animate-ai-pulse">
            <p className="text-[10px] font-black text-cyan-500 uppercase mb-1">Analysis_Result:</p>
            <p className="text-sm text-slate-300 italic leading-relaxed">{exercise.explanation}</p>
          </div>
        )}
        <div className="h-24" />
      </div>

      <div className="p-4 bg-slate-900 border-t border-slate-800 z-20">
        {exercise.type === "code" && (
          <button onClick={() => handleValidation(codeAnswer)} disabled={status === "checking" || status === "success"}
            className="w-full py-4 rounded-xl bg-cyan-600 text-white font-black uppercase tracking-widest hover:bg-cyan-500 transition-all disabled:opacity-50">
            {status === "checking" ? "Checking_Logic..." : "Validate_Neural_Pattern"}
          </button>
        )}
      </div>

      <div className="absolute bottom-[80px] left-0 w-full h-16 pointer-events-none bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent z-15" />
    </div>
  );
}
