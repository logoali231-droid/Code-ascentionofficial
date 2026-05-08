// src/types/core.d.ts
export {};

declare global {
  type CognitiveProfile = "Standard" | "tdah" | "Visual_Logic" | "Deep_Dive";
  type ItemRarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
  type ItemType = "chip" | "relic" | "booster" | "cosmetic";

  interface InventoryItem {
    id: string;
    name: string;
    description: string;
    price: number;
    rarity: ItemRarity;
    type: ItemType;
    effect?: string;
    effectValue?: number;
    quantity: number;
    equipped?: boolean;
    acquiredAt: number;
    fake?: boolean;
  }

  interface UserStats {
    id: string;
    xp: number;
    coins: number;
    streak: number;
    lastLogin: number;
    cognitive: CognitiveProfile;
    engineReady: boolean;
    activeCourse?: string;
    inventory: InventoryItem[];
    model?: string;
  }

  interface Exercise {
    id: string;
    type: "mcq" | "code" | "ordering";
    question: string;
    codeSnippet?: string;
    options: string[];
    answer: string;
    explanation: string;
  }

  interface Lesson {
    id: string;
    title: string;
    explanation: string;
    content: string;
    exercises: Exercise[];
    completed?: boolean;
  }

  interface Course {
    id: string;
    topic: string;
    level: number;
    difficulty: number;
    lessons: Lesson[];
    tags: string[];
    createdAt: number;
  }

  interface AppDatabase {
    user: { main: UserStats };
    courses: { [courseId: string]: Course };
    shop: { all: InventoryItem[] };
    memory: { [key: string]: any };
    errors: { [id: string]: { exerciseId: string; error: string; timestamp: number } };
  }
}