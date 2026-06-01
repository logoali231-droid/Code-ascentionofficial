"use client";

import { get, save } from "./db";

export interface MemorySummary {
  id: string;
  summary: string;
  updatedAt: number;
  lessonCount: number;
  topics: string[];
  weaknesses: string[];
  strengths: string[];
  mastery: number;
}

const MAX_RAW_ERRORS = 3;
const MAX_HISTORY_ITEMS = 5;
const SUMMARY_TRIGGER = 6;

function cleanText(text?: string): string {
  if (!text) return "";
  return text.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function buildMemorySummary({ lessons, memory, mastery }: any): string {
  const recentLessons = (lessons || [])
    .slice(-MAX_HISTORY_ITEMS)
    .map((l: any) => l.topic || l.title)
    .join(", ");

  const weaknesses = Object.entries(memory?.weaknesses || {})
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k)
    .join(", ");

  const strengths = Object.entries(memory?.topics || {})
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k)
    .join(", ");

  const recentErrors = (memory?.lastErrors || [])
    .slice(-MAX_RAW_ERRORS)
    .map((e: any) => e.topic)
    .join(", ");

  return `
MASTERY:${Math.round(mastery || 0)}

LESSONS:${recentLessons || "none"}

STRONG:${strengths || "none"}

WEAK:${weaknesses || "none"}

ERRORS:${recentErrors || "none"}
`.trim();
}

export function shouldUpdateSummary(lessonCount: number): boolean {
  return lessonCount > 0 && lessonCount % SUMMARY_TRIGGER === 0;
}

export async function saveMemorySummary(
  courseId: string,
  data: { lessons: any[]; memory: any; mastery: number },
): Promise<MemorySummary> {
  const summary = buildMemorySummary(data);

  const payload: MemorySummary = {
    id: `summary_${courseId}`,
    summary,
    updatedAt: Date.now(),
    lessonCount: data.lessons.length,
    topics: Object.keys(data.memory?.topics || {}),
    weaknesses: Object.keys(data.memory?.weaknesses || {}),
    strengths: Object.keys(data.memory?.topics || {}),
    mastery: data.mastery || 0,
  };

  await save("memory", payload, payload.id);
  return payload;
}

export async function getMemorySummary(courseId: string): Promise<string> {
  const data = await get("memory", `summary_${courseId}`);
  return data?.summary || "";
}

export function compressContext(text: string, max = 1000): string {
  if (!text) return "";
  if (text.length <= max) return text;

  const lines = text
    .split("\n")
    .filter(Boolean);

  return lines
    .slice(0, 20)
    .join("\n");
}
