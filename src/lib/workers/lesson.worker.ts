"use client";

import { runLLM } from "@/lib/llm/llmExecutor";
import { buildLessonPlan } from "./LessonGenerator";
import { getAdaptiveMetrics } from "./adaptiveMetrics";

self.onmessage = async (event) => {
  const { course, history } = event.data;

  try {
    // 🧠 1. pega contexto cognitivo real
    const adaptive = await getAdaptiveMetrics(
      course.difficulty,
      course.topic
    );

    // 📚 2. plano de aula adaptativo
    const plan = await buildLessonPlan({ course, history, adaptive });

    // 🧠 3. prompt com cérebro ativo
    const prompt = buildExplanationPrompt({
      plan,
      adaptiveContext: {
        ROUTING_STRATEGY: adaptive.routingStrategy,
        COGNITIVE_PROFILE: adaptive.rawProfile,
        DIFFICULTY: adaptive.difficulty,
        XP_MULTIPLIER: adaptive.xpMultiplier,
        FOCUS_MODE: adaptive.focusMode,
      },
    });

    // ⚡ 4. temperatura adaptativa (isso muda MUITO o comportamento do modelo)
    const temperature =
      adaptive.routingStrategy === "HIGH_COMPUTATION_CLOUD"
        ? 0.85
        : adaptive.routingStrategy === "LOW_LATENCY_LOCAL"
        ? 0.4
        : 0.65;

    const full = await runLLM(prompt, temperature);

    

    self.postMessage({
      type: "lesson",
      data: full,
      meta: {
        strategy: adaptive.routingStrategy,
        difficulty: adaptive.difficulty,
      },
    });

  } catch (err) {
    self.postMessage({
      type: "error",
      error: String(err),
    });
  }
};
