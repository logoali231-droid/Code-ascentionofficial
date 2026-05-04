export function safeParse(str: string) {
  try {
    return JSON.parse(str);
  } catch {
    const cleaned = str
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}