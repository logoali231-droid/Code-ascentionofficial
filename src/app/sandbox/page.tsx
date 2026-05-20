"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  Play,
  RotateCcw,
  Cpu,
  Terminal,
  Brain,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { calculateLevel } from "@/lib/others/level";
import { get } from "@/lib/others/db";

const DEFAULT_CODE = {
  javascript: `console.log("Hello JavaScript"); `,
  typescript: `console.log("Hello TypeScript"); `,
  python: `print("Hello Python")`,
};

export default function SandboxPage() {
  const router = useRouter();
  const [isLocked, setIsLocked] = useState(true);

  const [exercise, setExercise] = useState<any>(null);
  const [course, setCourse] = useState<any>(null);
  const [currentLesson, setCurrentLesson] = useState<any>(null);

  useEffect(() => {
    async function initSandbox() {
      // 1. Controle de Acesso por Nível
      const userData = await get("user", "main");
      const level = calculateLevel(userData?.xp || 0);

      if (level < 50) {
        alert("ACCESS DENIED: Neural interface requires Level 50.");
        router.push("/hub");
        return;
      }

      // 2. CORREÇÃO: Consome os modificadores populando dados se houver um contexto ativo de lição
      // (Pode ser estendido para ler de window.location / query params depois)
      setCourse({
        id: "javascript_core",
        stylePrompt: "Elite Cyberpunk Tutor",
      });
      setCurrentLesson({
        id: "lesson_01",
        difficulty: 2,
        conceptId: "logic_structures",
      });
      setExercise({
        question:
          "Crie um console.log que retorne exatamente 'Hello Code-Ascension'",
        answer: "Hello Code-Ascension",
        conceptId: "logic_structures",
        topic: "Variables & Outputs",
      });

      setIsLocked(false);
    }
    initSandbox();
  }, [router]);

  if (isLocked)
    return (
      <div className="bg-black min-h-screen flex items-center justify-center text-cyan-500 font-mono">
        ENCRYPTING CONNECTION...
      </div>
    );

  const [language, setLanguage] = useState<
    "javascript" | "typescript" | "python"
  >("javascript");

  const [code, setCode] = useState<string>(DEFAULT_CODE.javascript);

  const [output, setOutput] = useState<string[]>([]);

  const [running, setRunning] = useState(false);

  const [status, setStatus] = useState("NEURAL_ENVIRONMENT_IDLE");

  const consoleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [output]);

  function appendLog(message: string) {
    setOutput((prev: string[]) => [...prev, message]);
  }

  function resetSandbox() {
    setCode(DEFAULT_CODE[language]);

    setOutput([]);

    setStatus("SANDBOX_RESET_COMPLETE");
  }

  async function executeCode() {
    if (running) return;

    setRunning(true);
    setStatus("EXECUTING...");
    setOutput([]);

    try {
      appendLog("> Booting runtime...");

      await new Promise((resolve) => setTimeout(resolve, 400));

      const capturedLogs: string[] = [];

      const customConsole = {
        log: (...args: any[]) => {
          capturedLogs.push(args.map(String).join(" "));
        },
      };

      if (language === "javascript" || language === "typescript") {
        const runner = new Function("console", code);

        runner(customConsole);
      } else {
        capturedLogs.push("Python runtime placeholder.");
      }

      capturedLogs.forEach((log: string) => {
        appendLog(log);
      });

      appendLog("> Execution completed.");

      const finalUserAnswer = capturedLogs.join("\n").trim();

      // Verifica de forma segura se há um exercício ativo no estado do componente
      if (exercise) {
        setStatus("EVALUATING_OUTPUT...");

        // Import relativo dinâmico para evitar quebras de build do Next.js/Webpack
        const { evaluateExercise } = await import("../../lib/others/evaluator");

        const evalResult = await evaluateExercise({
          exercise,
          userAnswer: finalUserAnswer,
          course,
          lesson: currentLesson,
          conceptId: exercise?.conceptId || "core_fundamentals",
        });

        if (evalResult?.correct) {
          setStatus(
            `EXECUTION_SUCCESS | ASSIMILATED: +${evalResult.xp || 0}XP`,
          );
        } else {
          setStatus(
            `EXECUTION_FAILED | MISMATCH: ${evalResult?.feedback || "Neural mismatch detected."}`,
          );
        }
      } else {
        setStatus("EXECUTION_SUCCESS");
      }
    } catch (err: any) {
      appendLog(`[ERROR]: ${err?.message || "Unknown error"} `);
      setStatus("EXECUTION_FAILED");
    } finally {
      setRunning(false);
    }
  }

  const executionRate = useMemo(() => {
    return output.length;
  }, [output]);

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-cyan-400"
          >
            <ChevronLeft size={18} />
            VOLTAR
          </button>

          <div className="flex items-center gap-2 text-cyan-400">
            <Cpu size={18} />
            SANDBOX
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center gap-2 mb-4">
              <Terminal size={18} />
              <h2 className="font-bold">Code Editor</h2>
            </div>

            <div className="flex gap-2 mb-4">
              {Object.keys(DEFAULT_CODE).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setLanguage(lang as any);
                    setCode(DEFAULT_CODE[lang as keyof typeof DEFAULT_CODE]);
                  }}
                  className={`px-3 py-2 rounded-xl text-sm ${
                    language === lang
                      ? "bg-cyan-500 text-black"
                      : "bg-slate-800"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>

            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-125 bg-black border border-slate-700 rounded-2xl p-4 font-mono text-sm outline-none"
            />
          </section>

          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Brain size={18} />
                <h2 className="font-bold">Runtime Console</h2>
              </div>

              <div
                ref={consoleRef}
                className="h-87.5 overflow-y-auto bg-black border border-slate-700 rounded-2xl p-4 font-mono text-sm"
              >
                {output.length === 0 ? (
                  <div className="text-slate-500">Awaiting execution...</div>
                ) : (
                  output.map((line: string, index: number) => (
                    <div key={index} className="mb-2 text-cyan-300">
                      {line}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-4">
              <button
                onClick={executeCode}
                disabled={running}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-2xl py-4 flex items-center justify-center gap-2"
              >
                {running ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    EXECUTING
                  </>
                ) : (
                  <>
                    <Play size={18} />
                    RUN CODE
                  </>
                )}
              </button>

              <button
                onClick={resetSandbox}
                className="w-full border border-slate-700 rounded-2xl py-4 flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} />
                RESET
              </button>

              <div className="border border-slate-800 rounded-2xl p-4 bg-black">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} />
                  STATUS
                </div>

                <div className="flex items-center gap-2 text-sm">
                  {status.includes("FAILED") ? (
                    <AlertTriangle size={16} className="text-red-400" />
                  ) : status.includes("SUCCESS") ? (
                    <CheckCircle2 size={16} className="text-green-400" />
                  ) : (
                    <Cpu size={16} className="text-cyan-400" />
                  )}

                  {status}
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  Logs: {executionRate}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
