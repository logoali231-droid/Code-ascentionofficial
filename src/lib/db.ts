/**
 * src/lib/db.ts
 * Implementação de Auto-delete e Cleanup
 */

const DB_NAME = "codeascent_db";
const DB_VERSION = 1;
const MAX_LOG_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

let db: IDBDatabase;

function init(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const d = request.result;

      if (!d.objectStoreNames.contains("user")) d.createObjectStore("user");
      if (!d.objectStoreNames.contains("courses")) d.createObjectStore("courses");
      
      // Adicionamos um índice de timestamp para facilitar a limpeza
      if (!d.objectStoreNames.contains("errors")) {
        const store = d.createObjectStore("errors", { autoIncrement: true, keyPath: "id" });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }

      if (!d.objectStoreNames.contains("shop")) d.createObjectStore("shop");
      if (!d.objectStoreNames.contains("daily")) d.createObjectStore("daily");
      
      if (!d.objectStoreNames.contains("memory")) {
        const store = d.createObjectStore("memory");
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * LÓGICA DE CLEANUP (AUTO-DELETE)
 * Remove registros antigos para evitar inchaço do IndexedDB.
 */
export async function cleanupOldData() {
  const d = await init();
  const storesToClean = ["errors", "memory"]; // Stores que tendem a crescer muito
  const now = Date.now();

  for (const storeName of storesToClean) {
    const tx = d.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const index = store.index("timestamp");
    
    // Deleta tudo que for mais antigo que o MAX_LOG_AGE_MS
    const range = IDBKeyRange.upperBound(now - MAX_LOG_AGE_MS);
    const request = index.openCursor(range);

    request.onsuccess = (event: any) => {
      const cursor = event.target.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
      }
    };
  }
}

// ✅ GENERIC GET
export async function get<T = any>(store: string, key: string): Promise<T | null> {
  const d = await init();
  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, "readonly");
    const st = tx.objectStore(store);
    const req = st.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// ✅ GENERIC SAVE (Com carimbo de data para Cleanup)
export async function save(store: string, value: any, key: string = "main") {
  const d = await init();
  
  // Injeta timestamp se for um objeto para permitir o auto-delete depois
  const dataToSave = typeof value === 'object' ? { ...value, timestamp: Date.now() } : value;

  return new Promise((resolve, reject) => {
    const tx = d.transaction(store, "readwrite");
    const st = tx.objectStore(store);
    const req = st.put(dataToSave, key);
    req.onsuccess = () => {
      // Chama o cleanup em background ocasionalmente (ex: 10% das vezes)
      if (Math.random() < 0.1) cleanupOldData();
      resolve(true);
    };
    req.onerror = () => reject(req.error);
  });
}

// ✅ RESTANTE DAS FUNÇÕES (getAll, getRecord, saveRecord, etc) permanecem iguais...

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

export async function getRecord<T = any>(store: string, id?: string | number): Promise<T | null> {
  if (typeof id === "undefined") return get<T>(store, "main");
  return get<T>(store, String(id));
}

export async function saveRecord(store: string, value: any, id?: string | number) {
  return save(store, value, id !== undefined ? String(id) : "main");
}

export async function updateUser(updates: any) {
  const current = await getRecord("user", "main") || {};
  const merged = { ...current, ...updates };
  await saveRecord("user", merged, "main");
  return merged;
}