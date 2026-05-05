"use client";

import { useEffect, useState } from "react";
import { get, getAll, save } from "@/lib/db";
import { useRouter } from "next/navigation";
import { Book } from "lucide-react";

export default function Hub() {
  const [courses, setCourses] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
  async function check() {
    const user = await get("user", "main");

    if (!user?.engineReady) {
      router.push("/machineLock");
    }
  }

  check();
}, []);

  useEffect(() => {
    getAll("courses").then(setCourses);
  }, []);

  async function selectCourse(c: any) {
  const user = await get("user", "main");

  await save("user", {
    ...user, // 🔥 keep everything
    activeCourse: c.id,
  });

  router.push("/course");
}

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-bold mb-4 flex gap-2 items-center">
        <Book size={20} /> Courses
      </h1>

      <div className="space-y-3">
        {courses.map((c) => (
          <div
            key={c.id}
            onClick={() => selectCourse(c)}
            className="p-4 rounded-xl bg-slate-800 cursor-pointer"
          >
            <h3 className="font-semibold">{c.topic}</h3>
            <p className="text-sm text-slate-400">
              {c.level} • {c.difficulty}
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={() => router.push("/new")}
        className="mt-4 w-full bg-blue-600 py-2 rounded-xl"
      >
        New Course
      </button>
    </div>
  );
}