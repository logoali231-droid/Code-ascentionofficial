"use client";

import { useEffect, useState } from "react";
import { get, getAll } from "@/lib/db";
import { generateExplanation } from "@/lib/explanationAI";

export default function CoursePage() {
  const [course, setCourse] = useState<any>(null);
  const [tab, setTab] = useState("theory");
  const [explanation, setExplanation] = useState("");

  useEffect(() => {
    async function load() {
      const user = await get("user", "main");
      const all = await getAll("courses");

      const c = all.find((x: any) => x.id === user.activeCourse);

      document.body.dataset.profile = c.cognitive;

      setCourse(c);

      generateExplanationFor(c);
    }

    load();
  }, []);

  async function generateExplanationFor(c: any) {
    const lessons = c.lessons.slice(
      Math.max(0, c.currentIndex - 2),
      c.currentIndex + 1
    );

    const text = await generateExplanation({
      topic: c.topic,
      lessonTitles: lessons.map((l: any) => l.title),
      style: c.style,
      level: c.level,
      cognitive: c.cognitive,
    });

    setExplanation(text);
  }

  if (!course) return <div>Loading...</div>;

  const lessons = course.lessons.slice(
    Math.max(0, course.currentIndex - 2),
    course.currentIndex + 1
  );

  return (
  <div className="p-4 pb-24">
    <h1 className="text-xl font-bold mb-4">{course.topic}</h1>

    {/* Tabs */}
    <div className="flex gap-2 mb-4">
      {["theory", "practice", "explain"].map((t) => (
        <button
          key={t}
          onClick={() => setTab(t)}
          className={`px-3 py-1 rounded-full text-sm ${
            tab === t
              ? "bg-blue-600"
              : "bg-slate-700 text-slate-300"
          }`}
        >
          {t}
        </button>
      ))}
    </div>

    {/* THEORY */}
    {tab === "theory" && (
      <div className="space-y-4">
        {lessons.map((l: any, i: number) => (
          <div key={i} className="bg-slate-800 p-3 rounded-xl">
            <h3 className="font-semibold">{l.title}</h3>
            <p className="text-sm text-slate-300 mt-1">{l.theory}</p>
          </div>
        ))}
      </div>
    )}

    {/* PRACTICE */}
    {tab === "practice" && (
      <div className="bg-slate-800 p-4 rounded-xl">
        <p>Exercises coming next phase...</p>
      </div>
    )}

    {/* EXPLANATION */}
    {tab === "explain" && (
      <div className="bg-slate-800 p-4 rounded-xl">
        <p className="whitespace-pre-wrap text-sm">
          {explanation || "Generating..."}
        </p>
      </div>
    )}
  </div>
);
      {/* PRACTICE (placeholder) */}
      {tab === "practice" && (
        <div>
          <p>Exercises here...</p>
        </div>
      )}

      {/* EXPLANATION */}
      {tab === "explain" && (
        <div>
          <h2>Deep Explanation</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>
            {explanation || "Generating..."}
          </p>
        </div>
      )}
    </div>
  );
}