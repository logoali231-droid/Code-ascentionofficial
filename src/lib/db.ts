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
  },
});

export async function save(store: string, value: any) {
  return (await dbPromise).put(store, value);
}

export async function get(store: string, key: any) {
  return (await dbPromise).get(store, key);
}

export async function getAll(store: string) {
  return (await dbPromise).getAll(store);
}