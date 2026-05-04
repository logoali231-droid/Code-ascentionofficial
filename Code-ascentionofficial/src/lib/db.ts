"use client";

import { openDB } from "idb";

export const dbPromise = openDB("codeascent-db", 2, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("user"))
      db.createObjectStore("user", { keyPath: "id" });

    if (!db.objectStoreNames.contains("courses"))
      db.createObjectStore("courses", { keyPath: "id" });

    if (!db.objectStoreNames.contains("errors"))
      db.createObjectStore("errors", { autoIncrement: true });

    if (!db.objectStoreNames.contains("inventory"))
      db.createObjectStore("inventory", { keyPath: "id" });

    if (!db.objectStoreNames.contains("shop"))
      db.createObjectStore("shop");
  },
});

const DB_NAME = "code_ascent";
const DB_VERSION = 1;

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("user"))
        db.createObjectStore("user");

      if (!db.objectStoreNames.contains("courses"))
        db.createObjectStore("courses");

      if (!db.objectStoreNames.contains("errors"))
        db.createObjectStore("errors");

      if (!db.objectStoreNames.contains("shop"))
        db.createObjectStore("shop");

      if (!db.objectStoreNames.contains("memory"))
        db.createObjectStore("memory");

      if (!db.objectStoreNames.contains("daily"))
        db.createObjectStore("daily");
    },
  });
}

// ✅ AGORA ACEITA QUALQUER COISA
export async function save(store: string, value: any, KEY: string) {
  const db = await dbPromise;
  return db.put(store, value, value.id ?? "generated");
}

export async function get(store: string, key: any) {
  const db = await dbPromise;
  return db.get(store, key);
}

export async function getAll(store: string) {
  const db = await dbPromise;
  return db.getAll(store);
}

export async function del(store: string, key: string) {
  const db = await getDB();
  return db.delete(store, key);
}