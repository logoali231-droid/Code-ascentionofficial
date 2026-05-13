
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

import { calculateLevel } from "@/lib/level";
import { get } from "@/lib/db";

const DEFAULT_CODE = {
  javascript: `console.log("Hello JavaScript"); `,
  typescript: `console.log("Hello TypeScript"); `,
  python: `print("Hello Python")`,
};



export default function SandboxPage() {
  const router = useRouter();
  const [isLocked, setIsLocked] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      const userData = await get("user", "main");
      const level = calculateLevel(userData?.xp || 0);
      
      if (level < 50) {
        alert("ACCESS DENIED: Neural interface requires Level 50.");
        router.push("/hub");
      } else {
        setIsLocked(false);
      }
    }
    checkAccess();
  }, []);

  if (isLocked) return <div className="bg-black min-h-screen flex items-center justify-center text-cyan-500 font-mono">ENCRYPTING CONNECTION...</div>;


  const [language, setLanguage] = useState<
    "javascript" | "typescript" | "python"
  >("javascript");

  const [code, setCode] = useState<string>(
    DEFAULT_CODE.javascript
  );

  const [output, setOutput] = useState<string[]>([]);

  const [running, setRunning] = useState(false);

  const [status, setStatus] = useState(
    "NEURAL_ENVIRONMENT_IDLE"
  );

  const consoleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop =
        consoleRef.current.scrollHeight;
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

      await new Promise((resolve) =>
        setTimeout(resolve, 400)
      );

      const capturedLogs: string[] = [];

      const customConsole = {
        log: (...args: any[]) => {
          capturedLogs.push(
            args.map(String).join(" ")
          );
        },
      };

      if (
        language === "javascript" ||
        language === "typescript"
      ) {
        const runner = new Function(
          "console",
          code
        );

        runner(customConsole);
      } else {
        capturedLogs.push(
          "Python runtime placeholder."
        );
      }

      capturedLogs.forEach((log: string) => {
        appendLog(log);
      });

      appendLog("> Execution completed.");

      setStatus("EXECUTION_SUCCESS");
    } catch (err: any) {
      appendLog(
        `[ERROR]: ${ err?.message || "Unknown error" } `
      );

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
              <h2 className="font-bold">
                Code Editor
              </h2>
            </div>

            <div className="flex gap-2 mb-4">
              {Object.keys(DEFAULT_CODE).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setLanguage(lang as any);
                    setCode(
                      DEFAULT_CODE[
                        lang as keyof typeof DEFAULT_CODE
                      ]
                    );
                  }}
                  className={`px - 3 py - 2 rounded - xl text - sm ${
    language === lang
        ? "bg-cyan-500 text-black"
        : "bg-slate-800"
} `}
                >
                  {lang}
                </button>
              ))}
            </div>

            <textarea
              value={code}
              onChange={(e) =>
                setCode(e.target.value)
              }
              className="w-full h-[500px] bg-black border border-slate-700 rounded-2xl p-4 font-mono text-sm outline-none"
            />
          </section>

          <section className="space-y-4">

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Brain size={18} />
                <h2 className="font-bold">
                  Runtime Console
                </h2>
              </div>

              <div
                ref={consoleRef}
                className="h-[350px] overflow-y-auto bg-black border border-slate-700 rounded-2xl p-4 font-mono text-sm"
              >
                {output.length === 0 ? (
                  <div className="text-slate-500">
                    Awaiting execution...
                  </div>
                ) : (
                  output.map(
                    (
                      line: string,
                      index: number
                    ) => (
                      <div
                        key={index}
                        className="mb-2 text-cyan-300"
                      >
                        {line}
                      </div>
                    )
                  )
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
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />
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
                    <AlertTriangle
                      size={16}
                      className="text-red-400"
                    />
                  ) : status.includes("SUCCESS") ? (
                    <CheckCircle2
                      size={16}
                      className="text-green-400"
                    />
                  ) : (
                    <Cpu
                      size={16}
                      className="text-cyan-400"
                    />
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

