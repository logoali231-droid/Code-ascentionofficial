// src/types/core.ts

export type CognitiveProfile = "Standard" | "tdah" | "Visual_Logic" | "Deep_Dive";
export type ItemRarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
export type ItemType = "chip" | "relic" | "booster" | "cosmetic" | "custom";

// Nova interface para os logs de performance
export interface MemoryLog {
  id?: number;
  topic: string;
  exerciseId: string;
  success: boolean;
  attempts: number;
  timestamp: number;
  difficulty: number;
}

// Nova interface para o retorno do sistema adaptativo
export interface AdaptiveMetrics {
  difficulty: number;
  xpMultiplier: number;
  coinMultiplier: number;
  style: string;
  focusMode: boolean;
  durability?: number;    // Durabilidade atual do Chip (ex: 100)
  maxDurability?: number; // Durabilidade máxima (ex: 100)

}

// src/types/core.ts

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  price: number;
  rarity: ItemRarity;
  type: ItemType;
  icon?: string;          
  effect?: string;
  effectValue?: number;
  quantity: number;
  equipped?: boolean;
  acquiredAt: number;
  isFake?: boolean;
  requiredLevel: number;
  durability?: number;    // Durabilidade atual do Chip (ex: 100)
  maxDurability?: number; // Durabilidade máxima (ex: 100)
}

export interface UserStats {
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

  level: number;

  factionId: string;
  /*
    NEW PROGRESSION SYSTEM
  */

  rank?:
  | "Initiate"
  | "Operator"
  | "Architect"
  | "Ghost"
  | "Overmind";

  mastery?: number;

  /*
    UX feedback helper
  */

  lastXPReward?: number;
}



export interface Exercise {
  id: string;
  type: "mcq" | "code" | "ordering";
  question: string;
  codeSnippet?: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface Lesson {
  id: string;
  title: string;
  explanation: string;
  content: string;
  exercises: Exercise[];
  completed?: boolean;
}

export interface Course {
  id: string;
  topic: string;
  level: number;
  difficulty: number;
  lessons: Lesson[];
  tags: string[];
  createdAt: number;
}

export interface AppDatabase {
  user: { main: UserStats };
  courses: { [courseId: string]: Course };
  shop: { all: InventoryItem[] };
  memory: { [key: string]: any };
  errors: { [id: string]: { exerciseId: string; error: string; timestamp: number } };
}
