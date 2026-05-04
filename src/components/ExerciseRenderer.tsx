"use client";

import { useState } from "react";
import { evaluate } from "@/lib/evaluator";
import { updateUser } from "@/lib/userMemory";
import { save } from "@/lib/db";
import { updateStreak } from "@/lib/streak";
import CodeEditor from "./CodeEditor";
import { updateDailyProgress } from "@/lib/daily";
import RewardPopup from "./RewardPopup";
import { updateMemory } from "@/lib/userMemory";

export default function ExerciseRenderer({ exercise, onNext }: any) {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<null | boolean>(null);
  const [loading, setLoading] = useState(false);
  const [reward, setReward] = useState("");

  async function submit() {
    if (!answer) return;

    setLoading(true);

    await updateDailyProgress(1);

    const correct = await evaluate(
      answer,
      exercise.answer,
      exercise.type
    );
    await updateMemory({
  topic: exercise.question,
  correct,
  type: exercise.type,
  input: answer,
});

    await updateUser(correct);
    await updateStreak();

    // 🎯 REWARD (AGORA CORRETO)
    if (correct) {
      setReward("+10 XP");
    } else {
      setReward("Try again");

      const userExplanation = prompt(
        "What did you try to do? (helps AI explain better)"
      );

      await save("errors", {
        question: exercise.question,
        correct: exercise.answer,
        userAnswer: answer,
        userExplanation: userExplanation || "",
        difficulty: exercise.difficulty || 1,
        type: exercise.type,
      });
    }

    setFeedback(correct);
    setLoading(false);

    setTimeout(() => {
      setFeedback(null);
      setAnswer("");
      setReward("");
      onNext(correct);
    }, 900);
  }

  return (
    <div className="relative bg-slate-800 p-4 rounded-xl">
      <p className="mb-3">{exercise.question}</p>

      {/* MULTIPLE CHOICE */}
      {exercise.type === "mcq" &&
        exercise.options?.map((o: string) => (
          <button
            key={o}
            onClick={() => setAnswer(o)}
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

      {/* REWARD POPUP */}
      <RewardPopup show={!!reward} text={reward} />
    </div>
  );
}