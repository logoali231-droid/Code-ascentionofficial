"use client";

import { useEffect, useState } from "react";

import { getAll, get } from "@/lib/others/db";

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

  // Cleanup do WebLLM ao sair da página
  useEffect(() => {
    return () => {
      (async () => {
        try {
          const { unloadEngine } = await import(
            "@/lib/others/modelManager"
          );

          await unloadEngine();
        } catch (err) {
          console.error(
            "[ERRORS UNLOAD ERROR]",
            err,
          );
        }
      })();
    };
  }, []);

  async function load() {
    const e = await getAll("errors");
    setErrors(e.reverse());
  }

  async function openError(err: any) {
    try {
      setSelected(err);
      setExplanation("");
      setExercise(null);

      const user = await get("user", "main");

      let course = await get(
        "courses",
        user.activeCourse,
      );

      if (!course) {
        const all =
          (await get("courses", "all")) ||
          (await getAll("courses")) ||
          [];

        const arr = Array.isArray(all)
          ? all
          : all || [];

        course = arr.find(
          (c: any) =>
            c.id === user.activeCourse,
        );
      }

      setActiveCourse(course);

      // Lazy imports para evitar build crash
      const [
        explanationModule,
        reinforceModule,
      ] = await Promise.all([
        import("@/lib/others/explanationAI"),
        import("@/lib/others/reinforce"),
      ]);

      const explainError =
        explanationModule.explainError;

      const generateReinforcement =
        reinforceModule.generateReinforcement;

      // Stream da IA
      const expStream: any =
        await explainError({
          question: err.question,
          correct: err.correct,
          userAnswer: err.userAnswer,
          userExplanation:
            err.userExplanation,
          user,
          course,
        });

      // Streaming incremental
      let fullText = "";

      if (
        expStream &&
        typeof expStream[
          Symbol.asyncIterator
        ] === "function"
      ) {
        for await (const chunk of expStream) {
          const content =
            chunk.choices?.[0]?.delta
              ?.content || "";

          fullText += content;

          setExplanation(fullText);
        }
      } else {
        setExplanation(String(expStream));
      }

      // Exercício de reforço
      const ex =
        await generateReinforcement(
          err,
          course,
        );

      setExercise(ex);
    } catch (err) {
      console.error(
        "[OPEN ERROR FAILED]",
        err,
      );

      setExplanation(
        "Failed to generate explanation.",
      );
    }
  }

  async function retryExercise() {
    try {
      const reinforceModule =
        await import(
          "@/lib/others/reinforce"
        );

      const generateReinforcement =
        reinforceModule.generateReinforcement;

      const retry =
        await generateReinforcement(
          selected,
          activeCourse,
        );

      setExercise(retry);
    } catch (err) {
      console.error(
        "[RETRY EXERCISE FAILED]",
        err,
      );
    }
  }

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl mb-3">
        Mistakes
      </h1>

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
          <button
            onClick={() =>
              setSelected(null)
            }
          >
            ← Back
          </button>

          <h2 className="mt-2 font-bold">
            Explanation
          </h2>

          <div className="bg-slate-800 p-2 rounded whitespace-pre-wrap">
            {explanation ||
              "Thinking..."}
          </div>

          <h2 className="mt-4 font-bold">
            Practice
          </h2>

          {exercise && (
            <ExerciseRenderer
              rawExercise={exercise}
              onNext={async (
                correct: boolean,
              ) => {
                if (!correct) {
                  await retryExercise();
                } else {
                  alert(
                    "Nice. You fixed this mistake 🎯",
                  );
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
