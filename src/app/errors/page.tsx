"use client";

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

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const e = await getAll("errors");
    setErrors(e.reverse());
  }

  async function openError(err: any) {
    setSelected(err);

    const user = await get("user", "main");
    // attempt to read course by keyed record, fall back to array storage
    let course = await get("courses", user.activeCourse);
    if (!course) {
      const all = (await get("courses", "all")) || (await getAll("courses")) || [];
      const arr = Array.isArray(all) ? all : all || [];
      course = arr.find((c: any) => c.id === user.activeCourse);
    }

    const exp = await explainError({
      question: err.question,
      correct: err.correct,
      userAnswer: err.userAnswer,
      userExplanation: err.userExplanation,
      user,
      course,
    });
    setExplanation(exp);

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
              exercise={exercise}
              onNext={async (correct: boolean) => {
                if (!correct) {
                  const retry = await generateReinforcement(selected, selected.course);
                  setExercise(retry);
                } else {
                  alert("Nice. You fixed this mistake 🎯");
                }
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}