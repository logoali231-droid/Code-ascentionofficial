"use client";

import { unloadEngine } from "@/lib/modelManager"; // <-- ADICIONADO

import { useEffect, useState } from "react";
import { getAll, get } from "@/lib/db";
import { explainError } from "@/lib/explanationAI";
import { generateReinforcement } from "@/lib/reinforce";
import ExerciseRenderer from "@/components/ExerciseRenderer";

export default function ErrorsPage() {
  const [errors, setErrors] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [explanation, setExplanation] = useState("");
  const [exercise, setExercise] = useState<any>(null);
  const [activeCourse, setActiveCourse] = useState<any>(null);

  useEffect(() => {
    load();
  }, []);

  // Limpa o Web Worker do WebLLM se o usuário sair da página de Erros no meio de uma geração
  useEffect(() => {
    return () => {
      unloadEngine().catch((err) =>
        console.error("[ERRORS UNLOAD ERROR]", err),
      );
    };
  }, []);

  async function load() {
    const e = await getAll("errors");
    setErrors(e.reverse());
  }

  async function openError(err: any) {
    setSelected(err);
    setExplanation(""); // Limpa a explicação anterior

    const user = await get("user", "main");
    let course = await get("courses", user.activeCourse);
    if (!course) {
      const all =
        (await get("courses", "all")) || (await getAll("courses")) || [];
      const arr = Array.isArray(all) ? all : all || [];
      course = arr.find((c: any) => c.id === user.activeCourse);
    }

    // 1. Obtém o stream da IA
    const expStream: any = await explainError({
      question: err.question,
      correct: err.correct,
      userAnswer: err.userAnswer,
      userExplanation: err.userExplanation,
      user,
      course,
    });

    // 2. Consome o stream para atualizar o texto gradualmente
    let fullText = "";
    if (expStream && typeof expStream[Symbol.asyncIterator] === "function") {
      for await (const chunk of expStream) {
        const content = chunk.choices[0]?.delta?.content || "";
        fullText += content;
        setExplanation(fullText); // Atualiza a UI a cada pedaço de texto
      }
    } else {
      // Fallback caso a função retorne uma string simples
      setExplanation(String(expStream));
    }
    setActiveCourse(course); // ADICIONADO
    const ex = await generateReinforcement(err, course);
    setExercise(ex);
  }
  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl mb-3">Mistakes</h1>

      {/* LISTA */}
      {!selected &&
        errors.map((e, i) => (
          <div
            key={i}
            onClick={() => openError(e)}
            className="bg-slate-800 p-2 mb-2 rounded cursor-pointer"
          >
            {e.question}
          </div>
        ))}

      {/* DETALHE */}
      {selected && (
        <div>
          <button onClick={() => setSelected(null)}>← Back</button>

          <h2 className="mt-2 font-bold">Explanation</h2>
          <div className="bg-slate-800 p-2 rounded whitespace-pre-wrap">
            {explanation || "Thinking..."}
          </div>

          <h2 className="mt-4 font-bold">Practice</h2>
          {exercise && (
            <ExerciseRenderer
              rawExercise={exercise}
              onNext={async (correct: boolean) => {
                if (!correct) {
                  const retry = await generateReinforcement(
                    selected,
                    activeCourse,
                  );
                  setExercise(retry);
                } else {
                  alert("Nice. You fixed this mistake 🎯");
                }
              }}
              isStreaming={false}
              streamProgress={0}
            />
          )}
        </div>
      )}
    </div>
  );
}
