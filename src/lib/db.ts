import Dexie, { type Table } from "dexie";

const CLOUDFLARE_WORKER_URL =
  "https://code-ascension-api.logoali231.workers.dev/save-progress";
const syncChannel =
  typeof window !== "undefined" &&
  typeof BroadcastChannel !== "undefined"
    ? new BroadcastChannel("code_ascension_sync")
    : null;

if (typeof window !== "undefined" && syncChannel) {
  window.addEventListener("beforeunload", () => {
    syncChannel.close();
  });
}
const syncTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingCloudSync = new Map<string, any>();

const SAVE_DEBOUNCE_MS = 800;
/* =========================================================
   INTERFACES & TYPES (ESTRUTURA COMPLETA)
========================================================= */
export interface User {
  id: string;
  name?: string;
  xp: number;
  coins: number;
  streak: number;
  lastLogin: number;
  cognitive: "standard" | "tdah" | "deep_dive" | "visual_logic";
  level: number;
  factionId: string;
  customBanned?: string[];
  rank?: "Initiate" | "Operator" | "Architect" | "Ghost" | "Overmind";
  mastery?: number;
  timestamp?: number;
  [key: string]: any;
}

export interface Course {
  id: string;
  title?: string;
  topic?: string;
  level?: number;
  lessons: any[];
  currentLesson?: number;
  currentExercise?: number;
  difficulty?: number;
  stylePrompt?: string;
}

export interface AppError {
  id?: number;
  message: string;
  question?: string;
  courseId?: string;
  timestamp: number;
  [key: string]: any;
}

export interface Explanation {
  id?: number;
  text: string;
  timestamp: number;
}

export interface TelemetryMetric {
  id?: number;
  type: "execution_time" | "memory_leak" | "engine_fault" | "bundle_time";
  engine: string;
  language: string;
  duration: number;
  success: boolean;
  timestamp: number;
}

/* =========================================================
   DEXIE INSTANCE & DATABASE SCHEMA (VERSÃO 3)
========================================================= */
class CodeAscensionDB extends Dexie {
  user!: Table<User>;
  courses!: Table<Course>;
  errors!: Table<AppError>;
  explanations!: Table<Explanation>;
  shop!: Table<any>;
  daily!: Table<any>;
  memory!: Table<any>;
  curriculum!: Table<any>;
  telemetry!: Table<TelemetryMetric>;

  constructor() {
    super("codeascent_db");
    this.version(3).stores({
      user: "id",
      courses: "id",
      errors: "++id, timestamp, courseId",
      explanations: "++id, timestamp",
      shop: "id",
      daily: "id",
      memory: "id, timestamp",
      curriculum: "courseId, updatedAt",
      telemetry: "++id, timestamp, type",
    });
  }
}

export const db = new CodeAscensionDB();

/* =========================================================
   CLOUD & MULTI-TAB SYNCHRONIZATION ENGINE
========================================================= */
async function syncToCloud(storeName: string, data: any): Promise<void> {
  if (storeName !== "user" && storeName !== "courses") return;
 if (
  typeof navigator !== "undefined" &&
  !navigator.onLine
) {

  try {
    const payload = {
      store: storeName,
      userId: "main",
      payload: data,
      timestamp: Date.now(),
    };

    fetch(CLOUDFLARE_WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok)
          console.warn(
            `%c[SYNC:CLOUD] Worker retornou status: ${res.status}`,
            "color: #ff0055",
          );
        else
          console.log(
            `%c[SYNC:CLOUD] Dados de '${storeName}' espelhados na nuvem.`,
            "color: #00ffcc",
          );
      })
      .catch((err) => {
        console.error("%c[SYNC:CLOUD] Erro na requisição do Worker:", err);
      });
  } catch (e) {
    console.error("[SYNC:CLOUD] Falha ao tentar sincronizar:", e);
  }
}

if (syncChannel) {
  syncChannel.onmessage = async (event) => {
    const { store, data } = event.data;

    try {
      const table = (db as any)[store];

      if (table) {
        await table.put(data);

        console.log(
          `%c[MULTI-TAB] Tabela '${store}' sincronizada via BroadcastChannel.`,
          "color: #00ffcc",
        );
      }
    } catch (e) {
      console.error(
        "[MULTI-TAB] Falha ao processar sincronização paralela:",
        e,
      );
    }
  };
}

/* =========================================================
   CORE FUNCTIONS & WRAPPERS
========================================================= */
export async function save(
  storeName: string,
  value: any,
  key: string = "main",
): Promise<boolean> {
  try {
    const table = (db as any)[storeName];

    const dataToSave =
      typeof value === "object"
        ? {
            ...value,
            id: key,
            timestamp: Date.now(),
          }
        : value;

    await table.put(dataToSave);

    if (syncChannel) {
      syncChannel.postMessage({
        store: storeName,
        key,
        data: dataToSave,
      });
    }

    // Debounce agressivo para sync cloud
    const syncKey = `${storeName}:${key}`;

    pendingCloudSync.set(syncKey, dataToSave);

    const existingTimer = syncTimers.get(syncKey);

    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      const latest = pendingCloudSync.get(syncKey);

      if (latest) {
        await syncToCloud(storeName, latest);
        pendingCloudSync.delete(syncKey);
      }

      syncTimers.delete(syncKey);
    }, SAVE_DEBOUNCE_MS);

    syncTimers.set(syncKey, timer);

    return true;
  } catch (e) {
    console.error(`[DB] Erro ao salvar em ${storeName}:`, e);
    return false;
  }
}

export async function get<T = any>(
  storeName: string,
  key: string,
): Promise<T | null> {
  try {
    const table = (db as any)[storeName];
    return (await table.get(key)) || null;
  } catch {
    return null;
  }
}

export async function getAll<T = any>(storeName: string): Promise<T[]> {
  try {
    return await (db as any)[storeName].toArray();
  } catch {
    return [];
  }
}

export async function updateUser(updates: Partial<User>): Promise<User> {
  return await db.transaction("rw", db.user, async () => {
    const current = (await db.user.get("main")) || {
      id: "main",
      xp: 0,
      coins: 0,
      streak: 0,
      lastLogin: Date.now(),
      cognitive: "standard",
      level: 1,
      factionId: "default",
    };
    const merged = { ...current, ...updates, id: "main" };
    await db.user.put(merged);

if (syncChannel) {
  syncChannel.postMessage({
    store: "user",
    key: "main",
    data: merged,
  });
}

await syncToCloud("user", merged);
    return merged;
  });
}

export async function getUser(): Promise<User | null> {
  return get<User>("user", "main");
}

export async function getRecord<T = any>(
  store: string,
  id?: string | number,
): Promise<T | null> {
  return get<T>(store, id !== undefined ? String(id) : "main");
}

export async function saveRecord(
  store: string,
  value: any,
  id?: string | number,
): Promise<boolean> {
  return save(store, value, id !== undefined ? String(id) : "main");
}

/* =========================================================
   TELEMETRY & COURSE MANAGEMENT
========================================================= */
export async function saveTelemetryBatch(
  metrics: TelemetryMetric[],
): Promise<boolean> {
  if (!metrics.length) return true;
  try {
    await db.telemetry.bulkAdd(metrics);
    return true;
  } catch (e) {
    console.error(
      "%c[TELEMETRY:DB] Falha ao persistir lote de telemetria.",
      "color: #ff0055",
      e,
    );
    return false;
  }
}

export async function getErrorLogs(courseId: string): Promise<AppError[]> {
  try {
    return await db.errors.where("courseId").equals(courseId).toArray();
  } catch (e) {
    console.error("[DB] Erro ao buscar logs de erro:", e);
    return [];
  }
}

export async function clearErrorLog(id: number): Promise<boolean> {
  try {
    await db.errors.delete(id);
    return true;
  } catch (e) {
    console.error("[DB] Erro ao deletar log de erro:", e);
    return false;
  }
}

export async function addBannedTerm(term: string): Promise<void> {
  const settings = (await get<User>("user", "main")) || {
    id: "main",
    xp: 0,
    coins: 0,
    streak: 0,
    lastLogin: Date.now(),
    cognitive: "standard",
    level: 1,
    factionId: "default",
  };
  const currentBanned: string[] = settings.customBanned || [];

  if (!currentBanned.includes(term)) {
    await save(
      "user",
      {
        ...settings,
        customBanned: [...currentBanned, term],
      },
      "main",
    );
    console.log(
      `%c[PROTOCOL] Termo "${term}" injetado nas restrições.`,
      "color: #ff0055",
    );
  }
}

/* =========================================================
   MAINTENANCE & DETERMINISTIC AUTO-CLEANUP
========================================================= */
const MAX_LOG_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 Dias
const MAX_EXPLANATIONS_TOTAL = 100;
const MAX_ERRORS_TOTAL = 50;

export async function cleanupOldData(): Promise<void> {
  const now = Date.now();
  const expirationThreshold = now - MAX_LOG_AGE_MS;

  try {
    await db.explanations
      .where("timestamp")
      .below(expirationThreshold)
      .delete();
    await db.errors.where("timestamp").below(expirationThreshold).delete();
    await db.memory.where("timestamp").below(expirationThreshold).delete();

    await db.telemetry
  .where("timestamp")
  .below(expirationThreshold)
  .delete();

    const currentExpCount = await db.explanations.count();
    if (currentExpCount > MAX_EXPLANATIONS_TOTAL) {
      const overflow = currentExpCount - MAX_EXPLANATIONS_TOTAL;
      await db.explanations.orderBy("timestamp").limit(overflow).delete();
    }

    const currentErrorCount = await db.errors.count();
    if (currentErrorCount > MAX_ERRORS_TOTAL) {
      await db.errors
        .orderBy("timestamp")
        .limit(currentErrorCount - MAX_ERRORS_TOTAL)
        .delete();
    }
  } catch (err) {
    console.error(
      "%c[CLEANUP] Falha crítica na limpeza básica:",
      "color: #ff0055",
      err,
    );
  }
}

export async function performStorageCleanup(): Promise<void> {
  console.log(
    "%c⚙️ [SYSTEM] Iniciando ciclo de manutenção determinística...",
    "color: #ff9900",
  );

  await cleanupOldData();

  await db.courses.filter((c) => !c.lessons || c.lessons.length === 0).delete();

  try {
    const { cleanupVectorMemory } = await import("./vectorMemory");
    await cleanupVectorMemory();
  } catch (err) {
    console.error(
      "%c[SYSTEM] Falha ao processar sub-rotina de Vector Memory:",
      "color: #ff0055",
      err,
    );
  }

  console.log(
    "%c✅ [SYSTEM] Ciclo de vida de auto-cleanup concluído com sucesso.",
    "color: #00ffcc",
  );
}

export function useAutoCleanup() {
  return performStorageCleanup;
}
