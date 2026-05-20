import { get } from "@/lib/others/db";

export async function syncScoreToCloud(): Promise<boolean> {
  try {
    const user = await get("user", "main");
    if (!user) return false;

    const payload = {
      userId: user.id || "main",
      username:
        user.username || "Operator_" + Math.random().toString(36).substring(7),
      xp: user.xp || 0,
      factionId: user.faction || "unaligned", // Vincula com a facção escolhida
    };

    const res = await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch (error) {
    console.warn(
      "[LEADERBOARD] Modo offline mantido. Sincronização em background falhou.",
    );
    return false;
  }
}
