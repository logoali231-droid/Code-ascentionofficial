"use client";

import { useState } from "react";
import { generateLessons } from "@/lib/lessonGenerator";
import { save } from "@/lib/db";
import { useRouter } from "next/navigation";

export default function NewCourse() {
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("");
  const [level, setLevel] = useState("beginner");
  const [difficulty, setDifficulty] = useState("easy");
  const [cognitive, setCognitive] = useState("standard");
  const [base, setBase] = useState("");

  const router = useRouter();

  async function create() {
    const data = await generateLessons({
      topic,
      style,
      level,
      cognitive,
      userBase: base,
    });

    const course = {
      id: Date.now(),
      topic,
      style,
      level,
      cognitive,
      difficulty,
      currentIndex: 0,
      ...data,
    };

    await save("courses", course);

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

      <button onClick={create}>Forge Course</button>
    </div>
  );
}