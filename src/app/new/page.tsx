"use client";

import { useState } from "react";
import { generateLessons } from "@/lib/lessonGenerator";
import { get, save } from "@/lib/db";
import { useRouter } from "next/navigation";

export default function NewCourse() {
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("");
  const [level, setLevel] = useState("beginner");
  const [difficulty, setDifficulty] = useState("easy");
  const [cognitive, setCognitive] = useState("standard");
  const [base, setBase] = useState("");
  const [stylePrompt, setStylePrompt] = useState("");
  const id = crypto.randomUUID();
  const router = useRouter();
  

async function create() {
  const data = await generateLessons({
    topic,
    style,
    level,
    cognitive,
    userBase: base,
    stylePrompt,
  });

  // ✅ ONE ID ONLY
  const courseId = crypto.randomUUID();

  const course = {
    id: courseId,
    topic,
    style,
    level,
    cognitive,
    difficulty,
    stylePrompt,

    currentLesson: 0,
    currentExercise: 0,

    lessons: data.lessons || [],
  };

  // ✅ LOAD EXISTING COURSES
  const existing = (await get("courses", "all")) || [];

  // ✅ SAVE COURSES (ONLY ONCE)
  await save("courses", [...existing, course]);

  // ✅ UPDATE USER
  const user = (await get("user", "main")) || {};

  await save("user", {
    ...user,
    cognitive,
    style,
    activeCourse: courseId,
  });

  router.push("/hub");
}
  return (
    <div>
      <input placeholder="Topic" onChange={(e) => setTopic(e.target.value)} />

      <input
        placeholder="Explanation style (free text)"
        onChange={(e) => setStyle(e.target.value)}
      />

      <textarea
        placeholder="Reference base (optional)"
        onChange={(e) => setBase(e.target.value)}
      />

      <select onChange={(e) => setLevel(e.target.value)}>
        <option>beginner</option>
        <option>intermediate</option>
        <option>advanced</option>
      </select>

      <select onChange={(e) => setDifficulty(e.target.value)}>
        <option>easy</option>
        <option>medium</option>
        <option>hard</option>
        <option>expert</option>
      </select>

      <select onChange={(e) => setCognitive(e.target.value)}>
        <option>standard</option>
        <option>ADHD_Focus</option>
        <option>Deep_Dive</option>
        <option>Visual_Logic</option>
      </select>
      <textarea
        placeholder="How should the AI teach you? (e.g. explain like I'm 5, very technical, step-by-step...)"
        className="w-full p-2 rounded bg-slate-800 mt-3"
        value={stylePrompt}
        onChange={(e) => setStylePrompt(e.target.value)}
      />

      <button onClick={create}>Forge Course</button>
    </div>
  );
}