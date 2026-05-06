"use client";

import { useState, useEffect } from "react";
import { evaluate } from "@/lib/evaluator";
import { updateUser, updateMemory } from "@/lib/userMemory";
import { get, save } from "@/lib/db";
import { updateStreak } from "@/lib/streak";
import CodeEditor from "./CodeEditor";
import { updateDailyProgress } from "@/lib/daily";
import RewardPopup from "./RewardPopup";
import { playSound } from "@/lib/useSound";

export default function ExerciseRenderer({ exercise, onNext, course }: any) {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<null | boolean>(null);
  const [loading, setLoading] = useState(false);
  const [reward, setReward] = useState("");
  const [user, setUser] = useState<any>(null);
  const [cognitive, setCognitive] = useState("Standard");

  useEffect(() => {
    let mounted = true;

    async function load() {
      const u = await get("user", "main");
      if (!mounted) return;

      setUser(u);
      setCognitive(u?.cognitive || "Standard");
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  async function submit() {
    if (!answer) return;

    setLoading(true);

    await updateDailyProgress(1);

    const correct = await evaluate(
      answer,
      exercise.answer,
      exercise.type
    );

    // 🧠 MEMORY
    await updateMemory({
      topic: course?.topic || "general",
      correct,
      type: exercise.type,
      input: answer,
    });

    await updateUser(correct);
    await updateStreak();

    if (correct) {
      playSound("correct", cognitive);
      setReward("+10 XP");
    } else {
      playSound("wrong", cognitive);
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
        timestamp: Date.now(),
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

  // 🧠 cognitive-driven layout
  const containerStyle =
    cognitive === "ADHD_Focus"
      ? "space-y-6 text-lg"
      : cognitive === "Deep_Dive"
      ? "space-y-2 text-sm"
      : "space-y-3";

  return (
    <div className={`card relative bg-slate-800 p-4 rounded-xl ${containerStyle}`}>

      {/* QUESTION */}
      <p className="mb-3">{exercise.question}</p>

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