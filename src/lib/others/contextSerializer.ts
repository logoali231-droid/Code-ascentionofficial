"use client";

/* =========================================
   HISTORY SERIALIZER
========================================= */

export function serializeHistory(
  history: any[] = [],
  limit = 5,
): string {
  return history
    .slice(-limit)
    .map((message) => {
      const role = message?.role || "unknown";

      const content =
        typeof message?.content === "string"
          ? message.content.slice(0, 300)
          : "";

      return `${role}: ${content}`;
    })
    .join("\n");
}

/* =========================================
   SAFE TEXT HARD CAP
========================================= */

export function hardCap(
  text: string = "",
  limit = 2500,
): string {
  if (!text) return "";

  return text.length > limit
    ? text.slice(0, limit)
    : text;
}