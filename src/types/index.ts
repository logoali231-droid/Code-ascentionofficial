export type CognitiveProfile = "Standard" | "tdah" | "Visual_Logic" | "Deep_Dive";

export interface UserStats {
  id: string;
  xp: number;
  coins: number;
  streak: number;
  level: number;
  engineReady: boolean;
  activeCourse?: string;
  cognitive: CognitiveProfile; // 🧠 Agora com os perfis reais
  inventory: string[]; 
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  rarity: "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
  type: "chip" | "relic" | "booster";
  effectValue?: number;
}
