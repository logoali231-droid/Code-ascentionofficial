const DB_NAME = "codeascent_db";
const DB_VERSION = 1;

let db: IDBDatabase;

function init(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const d = request.result;

      if (!d.objectStoreNames.contains("user"))
        d.createObjectStore("user");

      if (!d.objectStoreNames.contains("courses"))
        d.createObjectStore("courses");

      if (!d.objectStoreNames.contains("errors"))
        d.createObjectStore("errors", { autoIncrement: true });

      if (!d.objectStoreNames.contains("shop"))
        d.createObjectStore("shop");

      if (!d.objectStoreNames.contains("daily"))
        d.createObjectStore("daily");

      if (!d.objectStoreNames.contains("memory"))
        d.createObjectStore("memory");
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

// ✅ GENERIC GET
export async function get<T = any>(
  store: string,
  key: string
): Promise<T | null> {
  const d = await init();

  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, "readonly");
    const st = tx.objectStore(store);
    const req = st.get(key);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// ✅ GENERIC SAVE
export async function save(
  store: string,
  value: any,
  key: string = "main"
) {
  const d = await init();

  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, "readwrite");
    const st = tx.objectStore(store);
    const req = st.put(value, key);

    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

// ✅ GET ALL
export async function getAll(store: string) {
  const d = await init();

  return new Promise<any[]>((resolve, reject) => {
    const tx = d.transaction(store, "readonly");
    const st = tx.objectStore(store);
    const req = st.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

// ✅ Helper para atualizar campos específicos sem perder o resto
export async function updateUser(updates: any) {
  const current = await get("user", "main") || {};
  const merged = { ...current, ...updates };
  await save("user", merged, "main");
  return merged;
}

export async function saveRecord(store: string, value: any, id?: string | number) {
  if (typeof id !== "undefined") {
    return save(store, value, String(id));
  }
  return save(store, value);
}

export async function getRecord(store: string, id?: string | number) {
  if (typeof id === "undefined") return get(store, "main");
  return get(store, String(id));
}

export async function getAllRecords(store: string) {
  return getAll(store);
}
