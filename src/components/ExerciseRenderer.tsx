"use client";

import { useState } from "react";
import { evaluate } from "@/lib/evaluator";
import { updateUser } from "@/lib/userMemory";
import { save } from "@/lib/db";

export default function ExerciseRenderer({ exercise, onNext }: any) {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");

  async function submit() {
    const correct = await evaluate(answer, exercise.answer);

    await updateUser(correct);

    if (!correct) {
      await save("errors", {
        question: exercise.question,
        correct: exercise.answer,
        difficulty: exercise.difficulty || 1,
      });
    }

    setFeedback(correct ? "✔ Correct" : "✖ Wrong");

    setTimeout(() => {
      setFeedback("");
      onNext(correct);
    }, 1000);
  }

  return (
    <div className="bg-slate-800 p-4 rounded-xl">
      <p>{exercise.question}</p>

      {exercise.type === "mcq" &&
        exercise.options.map((o: string) => (
          <button key={o} onClick={() => setAnswer(o)}>
            {o}
          </button>
        ))}

      {exercise.type === "short" && (
        <input onChange={(e) => setAnswer(e.target.value)} />
      )}

      <button onClick={submit}>Submit</button>

      <p>{feedback}</p>
    </div>
  );
}