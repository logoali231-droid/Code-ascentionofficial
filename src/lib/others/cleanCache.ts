type CacheResetOptions = {
  wipeIndexedDB?: boolean;
  preserveWebLLM?: boolean;
  preserveWorkspace?: boolean;

  /* ===============================
     SAFETY MODE (NEW)
  =============================== */
  aggressive?: boolean;
  dryRun?: boolean;
};

const WEBLLM_KEYWORDS = [
  "webllm",
  "mlc",
  "mlc-chat",
  "huggingface",
  "transformers",
  "model-cache",
];

const WORKSPACE_KEYWORDS = [
  "workspace",
  "project",
  "dexie",
  "opfs",
  "indexeddb-keyval",
];

/* =========================================================
   SAFE MATCHERS
========================================================= */

function matchesAny(name: string, list: string[]) {
  const lower = name.toLowerCase();
  return list.some((k) => lower.includes(k));
}

/* =========================================================
   MAIN RESET
========================================================= */

export async function fullClientCacheReset(
  options: CacheResetOptions = {}
) {
  const {
    wipeIndexedDB = false,
    preserveWebLLM = true,
    preserveWorkspace = true,
    aggressive = false,
    dryRun = false,
  } = options;

  console.log("[CACHE] Reset started");

  /* =====================================================
     STORAGE (SAFE CLEAR)
  ===================================================== */

  try {
    if (!dryRun) {
      localStorage.clear();
      sessionStorage.clear();
    }
  } catch (e) {
    console.warn("[CACHE] storage clear failed", e);
  }

  /* =====================================================
     CACHE API (SMART DELETE)
  ===================================================== */

  try {
    if ("caches" in window) {
      const keys = await caches.keys();

      await Promise.all(
        keys.map(async (key) => {
          const isWebLLM = matchesAny(key, WEBLLM_KEYWORDS);

          if (preserveWebLLM && isWebLLM && !aggressive) {
            console.log("[CACHE] keep webllm cache:", key);
            return;
          }

          if (!dryRun) {
            await caches.delete(key);
          }
        })
      );
    }
  } catch (e) {
    console.warn("[CACHE] cache api failed", e);
  }

  /* =====================================================
     INDEXEDDB (FIXED + FALLBACK SAFE)
  ===================================================== */

  if (wipeIndexedDB) {
    try {
      const dbs: any[] =
        typeof indexedDB.databases === "function"
          ? await indexedDB.databases()
          : []; // fallback safe

      for (const db of dbs) {
        const name = db?.name;
        if (!name) continue;

        const isWebLLM = matchesAny(name, WEBLLM_KEYWORDS);
        const isWorkspace = matchesAny(name, WORKSPACE_KEYWORDS);

        if (preserveWebLLM && isWebLLM && !aggressive) {
          console.log("[CACHE] keep webllm db:", name);
          continue;
        }

        if (preserveWorkspace && isWorkspace && !aggressive) {
          console.log("[CACHE] keep workspace db:", name);
          continue;
        }

        if (dryRun) {
          console.log("[CACHE][DRY] would delete:", name);
          continue;
        }

        await new Promise<void>((resolve) => {
          const req = indexedDB.deleteDatabase(name);

          req.onsuccess = () => resolve();
          req.onerror = () => resolve(); // fail-safe
          req.onblocked = () => resolve();
        });

        console.log("[CACHE] deleted db:", name);
      }
    } catch (e) {
      console.warn("[CACHE] indexeddb cleanup failed", e);
    }
  }

  /* =====================================================
     GC HINT (OPTIONAL)
  ===================================================== */

  try {
    // @ts-ignore
    globalThis.gc?.();
  } catch {}

  console.log("[CACHE] Reset complete");
}
