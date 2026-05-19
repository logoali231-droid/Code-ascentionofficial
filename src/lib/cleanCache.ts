export async function fullClientCacheReset() {
  try {
    console.log("[CACHE] Starting full reset...");

    // 1. localStorage
    localStorage.clear();

    // 2. sessionStorage
    sessionStorage.clear();

    // 3. Cache API (service worker)
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    // 4. IndexedDB (WebLLM / Dexie / models)
    const dbs = await indexedDB.databases?.();
    if (dbs) {
      await Promise.all(
        dbs.map((db) => {
          if (!db.name) return;
          return new Promise((resolve, reject) => {
            const req = indexedDB.deleteDatabase(db.name);
            req.onsuccess = () => resolve(true);
            req.onerror = () => reject(req.error);
            req.onblocked = () => console.warn("[CACHE] blocked:", db.name);
          });
        })
      );
    }

    console.log("[CACHE] Full reset completed.");
  } catch (err) {
    console.error("[CACHE] Reset error:", err);
  }
}
