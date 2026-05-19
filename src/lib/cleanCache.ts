export async function fullClientCacheReset() {
  try {
    console.log("[CACHE] Starting full reset...");

    // 1. localStorage
    localStorage.clear();

    // 2. sessionStorage
    sessionStorage.clear();

    // 3. Cache API (Service Worker)
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    // 4. IndexedDB cleanup (WebLLM / Dexie / models)
    const dbs =
      typeof indexedDB.databases === "function"
        ? await indexedDB.databases()
        : [];

    await Promise.all(
      dbs
        .filter((db): db is { name: string } => typeof db.name === "string")
        .map((db) => {
          return new Promise<void>((resolve, reject) => {
            const req = indexedDB.deleteDatabase(db.name);

            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);

            req.onblocked = () =>
              console.warn("[CACHE] blocked:", db.name);
          });
        })
    );

    console.log("[CACHE] Full reset completed.");
  } catch (err) {
    console.error("[CACHE] Reset error:", err);
  }
}
