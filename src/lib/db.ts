"use client";

import { openDB } from "idb";

const DB_NAME = "code-ascent-db";
const VERSION = 1;

async function getDB() {
  return openDB(DB_NAME, VERSION, {
    upgrade(db) {
      const stores = [
        "user",
        "courses",
        "errors",
        "memory",
        "daily",
        "economy",
        "streak",
      ];

      stores.forEach((s) => {
        if (!db.objectStoreNames.contains(s)) {
          db.createObjectStore(s);
        }
      });
    },
  });
}

// ✅ GET (flexível)
export async function get(store: string, key: string = "main") {
  const db = await getDB();
  return db.get(store, key);
}

// ✅ SAVE (flexível)
export async function save(
  store: string,
  value: any,
  key: string = "main"
) {
  const db = await getDB();
  return db.put(store, value, key);
}

// ✅ GET ALL
export async function getAll(store: string) {
  const db = await getDB();
  return db.getAll(store);
}