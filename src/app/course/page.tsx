"use client";

import { useEffect, useState } from "react";
import { 
  updateUser, 
  db,   
  getErrorLogs, 
  clearErrorLog, 
  getUser 
} from "@/lib/db"; 
import { generateReinforcement } from "@/lib/reinforce"; 
import ExerciseRenderer from "@/components/ExerciseRenderer";
import { generateExplanationAI, explainError } from "@/lib/explanationAI";
import { updateMemory } from "@/lib/userMemory";

export default function CoursePage() {
  const [course, setCourse] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [mode, setMode] = useState<"practice" | "reinforce">("practice");
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

  const [lessonTree, setLessonTree] = useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const userData = await getUser();
    setUser(userData);
    
    const activeCourseId = userData?.activeCourse;

    setStreak(userData?.streak || 0);

    // CORREÇÃO: A tabela correta no db.ts é 'daily', não 'kv'
    const dailyData = await db.daily.get("daily_main");
    if (dailyData) setDaily(dailyData);

    if (!activeCourseId) return;

    const found = await db.courses.get(activeCourseId);

    if (found) {
      setCourse(found);
      setLessonTree(found.lessons || []);
      
      // CORREÇÃO TS: Usando as propriedades do objeto Course
      setCurrentLesson((found as any).currentLesson || 0);
      setCurrentExercise((found as any).currentExercise || 0);
      
      // CORREÇÃO TS: 'topic' agora é acessado com casting para evitar erro de propriedade inexistente
      setTitle((found as any).topic || found.title || "Course"); 
      
      await loadExplanation(found, (found as any).currentLesson || 0);
    }
  }

  async function loadExplanation(currentCourse: any, lessonIndex: number) {
    if (!currentCourse?.lessons?.[lessonIndex]) return;
    setLoadingExplanation(true);
    try {
      const userData = await getUser();
      const history = currentCourse.lessons.slice(0, lessonIndex + 1);
      const lesson = currentCourse.lessons[lessonIndex];
      const text = await generateExplanationAI({
        lesson,
        history,
        user: userData,
        course: currentCourse,
      });
      setExplanation(text);
    } catch (e) {
      setExplanation("Não foi possível carregar a teoria no momento.");
    } finally {
      setLoadingExplanation(false);
    }
  }

  async function getNextStep(courseId: string, currentLevel: number) {
    const errors = await getErrorLogs(courseId);
    
    if (errors.length >= 2) {
      const criticalError = errors[0];
      const reinforcement = await generateReinforcement(criticalError, course);
      
      if (criticalError.id !== undefined) {
        await clearErrorLog(criticalError.id); 
      }
      
      return {
        type: 'REINFORCEMENT',
        data: reinforcement,
        isExtra: true
      };
    }

    return {
      type: 'NEW_CONTENT',
      level: currentLevel + 1
    };
  }

  const goToNextLesson = () => {
    setCurrentLesson(prev => prev + 1);
    setCurrentExercise(0);
  };

  const extendCourseTree = async (topic: string) => {
    console.log("Extending tree for", topic);
    return []; 
  };

  async function handleNext(correct: boolean) {
    if (!course) return;

    let updatedLessons = [...course.lessons];
    const lessonData = updatedLessons[currentLesson];
    const exercise = lessonData.exercises[currentExercise];

    const existingErrors = await db.errors.toArray();
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
      message: `Erro no exercício: ${exercise.question.substring(0, 30)}...`,
      question: exercise.question,
      correct: exercise.answer,
      userAnswer: exercise.userAnswer || "",
      userExplanation: exercise.userExplanation || "",
      timestamp: Date.now(),
      lesson: currentLesson,
      courseId: course.id,
    };

    await db.errors.add(errorEntry);

    await updateMemory({
      topic: course.topic || course.title,
      correct,
      type: "exercise",
      input: exercise.question,
    });

    if (correct) {
      const xpGain = 10;
      const coinGain = 2;
      const newXp = (user?.xp || 0) + xpGain;
      
      await updateUser({
        xp: newXp,
        coins: (user?.coins || 0) + coinGain,
        level: Math.floor(newXp / 100) + 1
      });
      
      const nextStep = await getNextStep(course.id, user?.level || 0);
      
      if (nextStep.type === 'REINFORCEMENT') {
        setMode('reinforce');
      } else {
        if (currentLesson >= lessonTree.length - 1 && currentExercise >= lessonData.exercises.length - 1) {
          const newLessons = await extendCourseTree(course.topic || course.title);
          setLessonTree([...lessonTree, ...newLessons]);
          updatedLessons = [...updatedLessons, ...newLessons];
        }
      }
    }

    let nextExercise = currentExercise;
    let nextLesson = currentLesson;

    if (correct) {
      nextExercise = currentExercise + 1;
      if (nextExercise >= updatedLessons[currentLesson].exercises.length) {
        nextLesson += 1;
        nextExercise = 0;
      }
    } else {
      nextExercise = currentExercise + 1;
    }

    const updatedCourse = {
      ...course,
      lessons: updatedLessons,
      currentLesson: nextLesson,
      currentExercise: nextExercise,
    };

    await db.courses.put(updatedCourse);
    
    setCourse(updatedCourse);
    setCurrentLesson(nextLesson);
    setCurrentExercise(nextExercise);

    const freshUser = await getUser();
    setUser(freshUser);

    if (nextLesson !== currentLesson) {
      await loadExplanation(updatedCourse, nextLesson);
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
        <h1 className="text-blue-400 font-bold uppercase tracking-wider">{title}</h1>
        <div className="flex gap-3">
           <span className="text-orange-400">🔥 {streak}</span>
           <span className="text-yellow-400">
             🎯 {daily.progress || 0}/{daily.goal || 5} (Lvl {user?.level || 1})
           </span>
        </div>
      </div>

      <div className="w-full bg-slate-700 h-2 rounded mb-3">
        <div
          className="bg-green-500 h-2 rounded transition-all"
          style={{ width: `${(currentExercise / (lesson.exercises.length || 1)) * 100}%` }}
        />
      </div>

      <div className="flex gap-2 mb-4">
        {["practice", "theory", "errors"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={`flex-1 p-2 rounded capitalize transition-colors ${tab === t ? "bg-blue-600 shadow-[0_0_10px_#2563eb]" : "bg-slate-700 opacity-70"}`}
          >
            {t === "errors" ? "Fix" : t}
          </button>
        ))}
      </div>

      {tab === "practice" && (
        <ExerciseRenderer exercise={exercise} onNext={handleNext} course={course} />
      )}

      {tab === "theory" && (
        <div className="bg-slate-800 p-4 rounded-xl border border-blue-500/30">
          <h2 className="mb-2 font-bold text-blue-400">Lesson {currentLesson + 1}</h2>
          {loadingExplanation ? (
            <p className="text-sm animate-pulse">Neural link active: Generating explanation...</p>
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
      const e = await getErrorLogs(course.id);
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
        <div key={i} className="bg-slate-800 p-3 rounded border-l-4 border-red-500 shadow-lg">
          <p className="text-xs mb-1 font-semibold text-red-400">❌ {err.question}</p>
          <p className="text-green-400 text-xs">✔ Resposta: {err.correct}</p>
          {aiExplanations[i] && (
            <p className="text-blue-300 text-xs mt-2 italic bg-slate-900/80 p-2 rounded border border-blue-500/20">
              🧠 {aiExplanations[i]}
            </p>
          )}
        </div>
      ))}
      {errors.length === 0 && (
        <div className="text-center p-8 opacity-50 border-2 border-dashed border-slate-700 rounded-xl">
           <p className="text-sm">System integrity: 100%. No critical errors found.</p>
        </div>
      )}
    </div>
  );
}