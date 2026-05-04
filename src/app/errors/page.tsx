"use client";

import { useEffect, useState } from "react";
import { getAll } from "@/lib/db";

export default function ErrorsPage() {
  const [errors, setErrors] = useState<any[]>([]);

  useEffect(() => {
    getAll("errors").then(setErrors);
  }, []);

  return (
    <div>
      <h1>Reinforcement</h1>

      {errors.map((e, i) => (
        <div key={i}>
          <p>{e.question}</p>
          <p>Correct: {e.correct}</p>
        </div>
      ))}
    </div>
  );
}