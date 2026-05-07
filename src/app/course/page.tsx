"use client";

import { useEffect, useState } from "react";
import { get, save, getAll } from "@/lib/db";
import ExerciseRenderer from "@/components/ExerciseRenderer";
import { generateExplanationAI, explainError } from "@/lib/explanationAI";
import { generateReinforcement } from "@/lib/reinforce";
import { updateMemory } from "@/lib/userMemory";

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

    const rawCourses = (await get("courses", "all")) || (await getAll("courses")) || [];
    const courses = Array.isArray(rawCourses) ? rawCourses : [];
    const found = courses.find((c: any) => c.id === activeCourseId);

    if (found) {
      setCourse(found);
      setCurrentLesson(found.currentLesson || 0);
      setCurrentExercise(found.currentExercise || 0);
      await loadExplanation(found, found.currentLesson || 0);
    }
  }

  async function loadExplanation(currentCourse: any, lessonIndex: number) {
    if (!currentCourse?.lessons?.[lessonIndex]) return;
    setLoadingExplanation(true);
    try {
      const user = await get("user", "main");
      const history = currentCourse.lessons.slice(0, lessonIndex + 1);
      const lesson = currentCourse.lessons[lessonIndex];
      const text = await generateExplanationAI({
        lesson,
        history,
        user,
        course: currentCourse,
      });
      setExplanation(text);
    } catch (e) {
      setExplanation("Não foi possível carregar a teoria no momento.");
    } finally {
      setLoadingExplanation(false);
    }
  }

  async function handleNext(correct: boolean) {
    if (!course) return;

    let updatedLessons = [...course.lessons];
    const lessonData = updatedLessons[currentLesson];
    const exercise = lessonData.exercises[currentExercise];

    const existingErrors = (await get("errors", "all")) || [];
    const sameQuestionErrors = existingErrors.filter(
      (e: any) => e.question === exercise.question
    );
    const tooManyErrorsSameTopic = sameQuestionErrors.length >= 2;

    if (!correct) {
      const newExercise = await generateReinforcement(
        {
          ...exercise,
          userAnswer: exercise.userAnswer || "",
          difficulty: tooManyErrorsSameTopic ? 0.5 : 1,
        },
        course
      );

      updatedLessons[currentLesson] = {
        ...updatedLessons[currentLesson],
        exercises: [
          ...updatedLessons[currentLesson].exercises.slice(0, currentExercise + 1),
          newExercise,
          ...updatedLessons[currentLesson].exercises.slice(currentExercise + 1),
        ],
      };
    }

    const errorEntry = {
      question: exercise.question,
      correct: exercise.answer,
      userAnswer: exercise.userAnswer || "",
      userExplanation: exercise.userExplanation || "",
      time: Date.now(),
      lesson: currentLesson,
      courseId: course.id,
    };

    await save("errors", [...existingErrors, errorEntry]);

    await updateMemory({
      topic: course.topic,
      correct,
      type: "exercise",
      input: exercise.question,
    });

    let nextExercise = currentExercise;
    let nextLesson = currentLesson;

    if (correct) {
      nextExercise = currentExercise + 1;
      const updatedLessonData = updatedLessons[currentLesson];
      if (nextExercise >= updatedLessonData.exercises.length) {
        nextLesson += 1;
        nextExercise = 0;
      }
    }

    const updated = {
      ...course,
      lessons: updatedLessons,
      currentLesson: nextLesson,
      currentExercise: nextExercise,
    };

    const rawCourses = (await get("courses", "all")) || (await getAll("courses")) || [];
    const courses = Array.isArray(rawCourses) ? rawCourses : [];
    const newCourses = courses.map((c: any) => (c.id === course.id ? updated : c));

    await save("courses", newCourses);
    setCourse(updated);
    setCurrentLesson(nextLesson);
    setCurrentExercise(nextExercise);

    if (nextLesson !== currentLesson) {
      await loadExplanation(updated, nextLesson);
    }
  }

  if (!course || !course.lessons[currentLesson]) {
    return <div className="p-4 text-center">Curso não encontrado ou finalizado.</div>;
  }

  const lesson = course.lessons[currentLesson];
  const exercise = lesson.exercises[currentExercise];

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between text-xs mb-2">
        <span className="text-orange-400">🔥 {streak}</span>
        <span className="text-yellow-400">
          🎯 {daily.progress}/{daily.goal}
        </span>
      </div>

      <div className="w-full bg-slate-700 h-2 rounded mb-3">
        <div
          className="bg-green-500 h-2 rounded transition-all"
          style={{ width: `${(currentExercise / lesson.exercises.length) * 100}%` }}
        />
      </div>

      <div className="flex gap-2 mb-4">
        {["practice", "theory", "errors"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={`flex-1 p-2 rounded capitalize ${tab === t ? "bg-blue-600" : "bg-slate-700"}`}
          >
            {t === "errors" ? "Fix" : t}
          </button>
        ))}
      </div>

      {tab === "practice" && (
        <ExerciseRenderer exercise={exercise} onNext={handleNext} course={course} />
      )}

      {tab === "theory" && (
        <div className="bg-slate-800 p-4 rounded-xl">
          <h2 className="mb-2 font-bold">Lesson {currentLesson + 1}</h2>
          {loadingExplanation ? (
            <p className="text-sm animate-pulse">Generating explanation...</p>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{explanation}</p>
          )}
        </div>
      )}

      {tab === "errors" && <ErrorsTab course={course} />}
    </div>
  );
}

function ErrorsTab({ course }: { course: any }) {
  const [errors, setErrors] = useState<any[]>([]);
  const [aiExplanations, setAiExplanations] = useState<Record<number, string>>({});

  useEffect(() => {
    async function loadErrors() {
      const e = (await get("errors", "all")) || [];
      const last = e.slice(-5);
      setErrors(last);

      const results = await Promise.all(
        last.map((err: any) =>
          explainError({ ...err, course }).catch(() => "Failed to explain.")
        )
      );

      const map: Record<number, string> = {};
      results.forEach((res, i) => { map[i] = res; });
      setAiExplanations(map);
    }
    loadErrors();
  }, [course]);

  return (
    <div className="space-y-3">
      {errors.map((err, i) => (
        <div key={i} className="bg-slate-800 p-3 rounded border-l-4 border-red-500">
          <p className="text-xs mb-1 font-semibold">❌ {err.question}</p>
          <p className="text-green-400 text-xs">✔ Resposta: {err.correct}</p>
          {aiExplanations[i] && (
            <p className="text-blue-400 text-xs mt-2 italic bg-slate-900 p-2 rounded">
              🧠 {aiExplanations[i]}
            </p>
          )}
        </div>
      ))}
      {errors.length === 0 && <p className="text-center text-sm opacity-50">No errors yet</p>}
    </div>
  );
}