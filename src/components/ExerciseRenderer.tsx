"use client";

import { useState } from "react";
import { evaluate } from "@/lib/evaluator";
import { updateUser } from "@/lib/userMemory";
import { save } from "@/lib/db";
import { updateStreak } from "@/lib/streak";
import CodeEditor from "./CodeEditor";
import { updateDailyProgress } from "@/lib/daily";


export default function ExerciseRenderer({ exercise, onNext }: any) {
    const [answer, setAnswer] = useState("");
    const [feedback, setFeedback] = useState<null | boolean>(null);
    const [loading, setLoading] = useState(false);

    async function submit() {

        await updateDailyProgress(1);
        if (!answer) return;

        setLoading(true);

        const correct = await evaluate(
            answer,
            exercise.answer,
            exercise.type
        );

        await updateUser(correct);
        await updateStreak();

        if (!correct) {
            const userExplanation = prompt(
                "What did you try to do? (helps the AI explain better)"
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
            onNext(correct);
        }, 800);
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
                        className={`block w-full mt-2 p-2 rounded ${answer === o
                                ? "bg-blue-600"
                                : "bg-slate-700"
                            }`}
                    >
                        {o}
                    </button>
                ))}

            {/* SHORT ANSWER */}
            {exercise.type === "short" && (
                <input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    className="w-full p-2 rounded bg-slate-700 mt-2"
                    placeholder="Type your answer..."
                />
            )}

            {/* CODE EDITOR */}
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

            {/* FEEDBACK OVERLAY */}
            {feedback !== null && (
                <div
                    className={`absolute inset-0 flex items-center justify-center text-3xl font-bold rounded-xl ${feedback
                            ? "bg-green-500/80"
                            : "bg-red-500/80"
                        }`}
                >
                    {feedback ? "✔" : "✖"}
                </div>
            )}
        </div>
    );
}