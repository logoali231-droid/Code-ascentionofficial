"use client";

import { useEffect, useState } from "react";
import { get, save } from "@/lib/db";
import ExerciseRenderer from "@/components/ExerciseRenderer";
import { generateExplanationAI } from "@/lib/explanationAI"; 
// (Ou ajuste o nome para bater 100% com o nome que você descobriu no Passo 1)
import { explainError } from "@/lib/explanationAI";


export default function CoursePage() {
  const [course, setCourse] = useState<any>(null);
  const [currentLesson, setCurrentLesson] = useState(0);
  const [currentExercise, setCurrentExercise] = useState(0);

  const [tab, setTab] = useState<"practice" | "theory" | "errors">("practice");

  const [title, setTitle] = useState("Course");
  const [daily, setDaily] = useState<any>({
    progress: 0,
    goal: 5,
    completed: false,
  });
  const [streak, setStreak] = useState(0);

  const [explanation, setExplanation] = useState("");
  const [loadingExplanation, setLoadingExplanation] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const user = await get("user", "main");
    const activeCourseId = user?.activeCourse;

    setStreak(user?.streak || 0);
    setTitle(activeCourseId || "Course");

    const dailyData = await get("daily", "main");
    if (dailyData) setDaily(dailyData);

    if (!activeCourseId) return;

    const courses = (await get("courses", "all")) || [];
    const found = courses.find((c: any) => c.id === activeCourseId);

    if (found) {
      setCourse(found);
      setCurrentLesson(found.currentLesson || 0);
      setCurrentExercise(found.currentExercise || 0);

      await loadExplanation(found, found.currentLesson || 0);
    }
  }

  async function loadExplanation(currentCourse: any, lessonIndex: number) {
    setLoadingExplanation(true);

    const user = await get("user", "main");

    const history = currentCourse.lessons.slice(
      Math.max(0, lessonIndex - 2),
      lessonIndex + 1
    );

    const lesson = currentCourse.lessons[lessonIndex];

    const text = await generateExplanationAI({
      lesson,
      history,
      user,
      course: currentCourse,
    });

    setExplanation(text);
    setLoadingExplanation(false);
  }
async function handleNext(correct: boolean) {
  if (!course) return;

  let nextExercise = currentExercise + 1;
  let nextLesson = currentLesson;

  const lessonData = course.lessons[currentLesson];

  const endOfLesson = nextExercise >= lessonData.exercises.length;

  if (endOfLesson) {
    nextLesson += 1;
    nextExercise = 0;
  }

  const updated = {
    ...course,
    currentLesson: nextLesson,
    currentExercise: nextExercise,
  };

  const courses = (await get("courses", "all")) || [];

  const newCourses = courses.map((c: any) =>
    c.id === course.id ? updated : c
  );

  await save("courses", newCourses);

  setCourse(updated);
  setCurrentLesson(nextLesson);
  setCurrentExercise(nextExercise);

  await loadExplanation(updated, nextLesson);
}

  if (!course) {
    return <div className="p-4 text-center">No active course</div>;
  }

  const lesson = course.lessons[currentLesson];
  const exercise = lesson.exercises[currentExercise];

  return (
    <div className="p-4 pb-24">

      {/* TOP BAR */}
      <div className="flex justify-between text-xs mb-2">
        <span className="text-orange-400">🔥 {streak}</span>
        <span className="text-yellow-400">🎯 {daily.progress}/{daily.goal}</span>
      </div>

      {/* DAILY */}
      <div className="text-xs mb-2">
        🎯 {daily?.progress}/{daily?.goal}
      </div>

      {daily?.completed && (
        <div className="bg-green-500 text-black text-xs p-2 rounded mb-2 text-center">
          Daily completed 🎉
        </div>
      )}
      {/* PROGRESS BAR */}
      <div className="w-full bg-slate-700 h-2 rounded mb-3">
        <div
          className="bg-green-500 h-2 rounded"
          style={{
            width: `${(currentExercise / lesson.exercises.length) * 100}%`,
          }}
        />
      </div>

      {/* TABS */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("practice")}
          className={`flex-1 p-2 rounded ${tab === "practice" ? "bg-blue-600" : "bg-slate-700"
            }`}
        >
          Practice
        </button>

        <button
          onClick={() => setTab("theory")}
          className={`flex-1 p-2 rounded ${tab === "theory" ? "bg-blue-600" : "bg-slate-700"
            }`}
        >
          Theory
        </button>

        <button
          onClick={() => setTab("errors")}
          className={`flex-1 p-2 rounded ${tab === "errors" ? "bg-blue-600" : "bg-slate-700"
            }`}
        >
          Fix
        </button>
      </div>

      {/* PRACTICE */}
      {tab === "practice" && (
        <ExerciseRenderer
          exercise={exercise}
          onNext={handleNext}
        />
      )}

      {/* THEORY (IA REAL) */}
      {tab === "theory" && (
        <div className="bg-slate-800 p-4 rounded-xl">
          <h2 className="mb-2">
            Lesson {currentLesson + 1}
          </h2>

          {loadingExplanation ? (
            <p className="text-sm">Generating explanation...</p>
          ) : (
            <p className="text-sm whitespace-pre-wrap">
              {explanation}
            </p>
          )}
        </div>
      )}

      {/* ERRORS */}
      {tab === "errors" && <ErrorsTab />}
    </div>
  );
}

function ErrorsTab() {
  const [errors, setErrors] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const e = (await get("errors", "all")) || [];
    setErrors(e.slice(-5));
  }

  return (
    <div className="space-y-3">
      {errors.map((err, i) => (
        <div key={i} className="bg-slate-800 p-3 rounded">
          <p className="text-xs mb-1">❌ {err.question}</p>
          <p className="text-green-400 text-xs">✔ {err.correct}</p>

          {err.userExplanation && (
            <p className="text-yellow-400 text-xs mt-1">
              💭 {err.userExplanation}
            </p>
          )}
        </div>
      ))}

      {errors.length === 0 && (
        <p className="text-center text-sm">No errors yet</p>
      )}
    </div>
  );
}