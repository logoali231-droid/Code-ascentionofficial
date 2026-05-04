"use client";

import { openDB } from "idb";

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
export async function save(
  store: string,
  // We accept both calling conventions to remain backward compatible:
  // - save(store, key, value)
  // - save(store, value, key?)
  // and the two-argument form save(store, value).
  a: any,
  b?: any
) {
  const db = await getDB();

  let value: any;
  let key: string | number | undefined;

  if (b === undefined) {
    // two-arg: save(store, value)
    value = a;
    key = undefined;
  } else {
    // three-arg: need to detect order
    // If 'a' is a string/number it's probably the key: save(store, key, value)
    if (typeof a === "string" || typeof a === "number") {
      key = a;
      value = b;
    } else {
      // otherwise assume save(store, value, key)
      value = a;
      key = b as any;
    }
  }

  return db.put(store, value, key as any);
}

export async function get(store: string, key: string) {
  const db = await getDB();
  return db.get(store, key);
}

export async function getAll(store: string) {
  const db = await getDB();
  return db.getAll(store);
}

export async function del(store: string, key: string) {
  const db = await getDB();
  return db.delete(store, key);
}