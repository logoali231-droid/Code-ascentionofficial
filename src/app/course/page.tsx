"use client";

import { useEffect, useState } from "react";
import { get, save } from "@/lib/db";
import ExerciseRenderer from "@/components/ExerciseRenderer";
import { generate } from "@/lib/webllm";
import { safeParse } from "@/lib/safeParse";
import LevelUp from "@/components/LevelUp";

export default function CoursePage() {
  const [course, setCourse] = useState<any>(null);
  const [tab, setTab] = useState("theory");
  const [exerciseIndex, setExerciseIndex] = useState(0);

  const [explanation, setExplanation] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [errorAI, setErrorAI] = useState("");

  const [streak, setStreak] = useState(0);
  const [showLevel, setShowLevel] = useState(false);

  useEffect(() => {
    loadCourse();
  }, []);

  async function loadCourse() {
    const user = await get("user", "main");
    if (!user?.activeCourse) return;

    const c = await get("courses", user.activeCourse);

    setCourse(c);
    setStreak(user?.streak || 0);

    generateExplanation(c);
  }

  // 🧠 EXPLANATION COM IA
  async function generateExplanation(c: any) {
    setLoadingAI(true);
    setErrorAI("");

    try {
      const lessons = c.lessons
        .slice(Math.max(0, c.currentIndex - 2), c.currentIndex + 1)
        .map((l: any) => l.title)
        .join(", ");

      const prompt = `
Explain clearly:
${lessons}

Style: ${c.style}
`;

      const res = await generate(prompt);
      setExplanation(res);
    } catch {
      setErrorAI("AI failed");
    }

    setLoadingAI(false);
  }

  // 🎮 PROGRESSÃO
  async function handleNext(correct: boolean) {
    if (!course) return;

    const updated = { ...course };
    const lesson = updated.lessons[updated.currentIndex];

    if (correct) {
      setExerciseIndex((i) => i + 1);
    }

    if (exerciseIndex >= lesson.exercises.length - 1) {
      updated.currentIndex += 1;
      setExerciseIndex(0);

      // ♾ infinito
      if (updated.currentIndex >= updated.lessons.length) {
        const res = await generate(`
Generate more lessons about ${updated.topic}

Return JSON:
{
 "lessons": [
   {
     "title": "",
     "theory": "",
     "exercises": [
       { "type": "short", "question": "", "answer": "" }
     ]
   }
 ]
}
        `);

        const parsed = safeParse(res);

        if (parsed?.lessons) {
          updated.lessons.push(...parsed.lessons);
        }
      }
    }

    await save("courses", updated);
    setCourse(updated);

    // 🔥 streak update visual
    const user = await get("user", "main");
    setStreak(user?.streak || 0);

    // 🎉 level up check
    if (user?.xp && user.xp % 100 === 0) {
      setShowLevel(true);
      setTimeout(() => setShowLevel(false), 1500);
    }
  }

  if (!course) return <p className="p-4">Loading...</p>;

  const currentLesson = course.lessons[course.currentIndex];

  return (
    <div className="p-4 pb-24">
      {/* 🔥 HEADER */}
      <div className="flex justify-between mb-3 text-sm">
        <span>🔥 {streak}</span>
        <span>Lesson {course.currentIndex + 1}</span>
      </div>

      {/* 📊 PROGRESS BAR */}
      <div className="h-2 bg-slate-700 rounded mb-4">
        <div
          className="h-2 bg-blue-500 rounded transition-all"
          style={{
            width: `${
              ((exerciseIndex + 1) / currentLesson.exercises.length) * 100
            }%`,
          }}
        />
      </div>

      <h1 className="text-xl font-bold mb-4">{course.topic}</h1>

      {/* TABS */}
      <div className="flex gap-2 mb-4">
        {["theory", "practice", "explain"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded ${
              tab === t ? "bg-blue-600" : "bg-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* THEORY */}
      {tab === "theory" && (
        <div className="space-y-3">
          {course.lessons
            .slice(Math.max(0, course.currentIndex - 2), course.currentIndex + 1)
            .map((l: any, i: number) => (
              <div key={i} className="bg-slate-800 p-3 rounded">
                <h3 className="font-semibold">{l.title}</h3>
                <p className="text-sm">{l.theory}</p>
              </div>
            ))}
        </div>
      )}

      {/* PRACTICE */}
      {tab === "practice" && (
        <ExerciseRenderer
          exercise={currentLesson.exercises[exerciseIndex]}
          onNext={handleNext}
        />
      )}

      {/* EXPLANATION */}
      {tab === "explain" && (
        <div className="bg-slate-800 p-3 rounded whitespace-pre-wrap">
          {loadingAI && <p>Thinking...</p>}
          {errorAI && <p className="text-red-400">{errorAI}</p>}
          {!loadingAI && !errorAI && explanation}
        </div>
      )}

      {/* 🎉 LEVEL UP */}
      {showLevel && (
        <LevelUp level={Math.floor((course.xp || 0) / 100)} />
      )}
    </div>
  );
}