import { get, save } from "@/lib/others/db";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function updateStreak() {
  const user = await get("user", "main");

  const last = user?.lastActive;
  const now = today();

  let streak = user?.streak || 0;

  if (last === now) return streak;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const y = yesterday.toISOString().slice(0, 10);

  if (last === y) {
    streak += 1;
  } else {
    streak = 1;
  }

  await save("user", {
    ...user,
    streak,
    lastActive: now,
  });

  return streak;
}
