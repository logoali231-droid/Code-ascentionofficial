/**
 * 🧠 PERFIS COGNITIVOS
 * Define como a IA e a UI se adaptam ao usuário.
 */
export type CognitiveProfile = "Standard" | "tdah" | "Visual_Logic" | "Deep_Dive";

/**
 * 📦 ITENS E INVENTÁRIO
 */
export type ItemRarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
export type ItemType = "chip" | "relic" | "booster" | "cosmetic";

export interface InventoryItem {
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
  fake?: boolean; // Identifica itens gerados por IA
}

/**
 * 👤 STATUS DO USUÁRIO (Stored in 'user' store)
 */
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
  model?: string; // Modelo de IA selecionado
}

/**
 * 📝 EXERCÍCIOS E LIÇÕES
 */
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

/**
 * 📚 CURSOS PROCEDURAIS
 */
export interface Course {
  id: string;
  topic: string;
  level: number;
  difficulty: number;
  lessons: Lesson[];
  tags: string[];
  createdAt: number;
}

/**
 * 💾 ESTRUTURA DO BANCO (IndexedDB Map)
 */
export interface AppDatabase {
  user: {
    main: UserStats;
  };
  courses: {
    [courseId: string]: Course;
  };
  shop: {
    all: InventoryItem[]; // Itens gerados pela IA na loja
  };
  memory: {
    [key: string]: any; // TopicMastery e logs de aprendizado
  };
  errors: {
    [id: string]: {
      exerciseId: string;
      error: string;
      timestamp: number;
    };
  };
}
