type CacheResetOptions = {
  wipeIndexedDB?: boolean;

  /* =========================================
     Preserve WebLLM model cache
  ========================================= */

  preserveWebLLM?: boolean;

  /* =========================================
     Preserve workspace/project DBs
  ========================================= */

  preserveWorkspace?: boolean;
};

export async function fullClientCacheReset(
  options: CacheResetOptions = {}
) {

  const {
    wipeIndexedDB = false,
    preserveWebLLM = true,
    preserveWorkspace = true,
  } = options;

  try {

    console.log(
      "[CACHE] Starting full reset..."
    );

    /* =====================================================
       LOCAL STORAGE
    ===================================================== */

    try {

      localStorage.clear();

    } catch (err) {

      console.warn(
        "[CACHE] localStorage clear failed",
        err
      );
    }

    /* =====================================================
       SESSION STORAGE
    ===================================================== */

    try {

      sessionStorage.clear();

    } catch (err) {

      console.warn(
        "[CACHE] sessionStorage clear failed",
        err
      );
    }

    /* =====================================================
       CACHE API
    ===================================================== */

    try {

      if (typeof caches !== "undefined") {

        const keys =
          await caches.keys();

        await Promise.all(
          keys.map(async (key) => {

            try {

              /* =====================================
                 PRESERVE WEBLLM CACHE
              ===================================== */

              if (
                preserveWebLLM &&
                key
                  .toLowerCase()
                  .includes("webllm")
              ) {

                console.log(
                  "[CACHE] Preserving cache:",
                  key
                );

                return;
              }

              await caches.delete(key);

            } catch (err) {

              console.warn(
                "[CACHE] Cache delete failed:",
                key,
                err
              );
            }
          })
        );
      }

    } catch (err) {

      console.warn(
        "[CACHE] Cache API cleanup failed",
        err
      );
    }

    /* =====================================================
       INDEXEDDB
    ===================================================== */

    if (!wipeIndexedDB) {

      console.log(
        "[CACHE] IndexedDB wipe skipped"
      );

    } else {

      try {

        if (
          typeof indexedDB.databases ===
          "function"
        ) {

          const dbs =
            await indexedDB.databases();

          await Promise.all(
            dbs.map(async (db) => {

              const dbName =
                db.name;

              if (!dbName) {
                return;
              }

              const lower =
                dbName.toLowerCase();

              /* =====================================
                 PRESERVE WEBLLM
              ===================================== */

              if (
                preserveWebLLM &&
                (
                  lower.includes("webllm") ||
                  lower.includes("mlc") ||
                  lower.includes("model")
                )
              ) {

                console.log(
                  "[CACHE] Preserving WebLLM DB:",
                  dbName
                );

                return;
              }

              /* =====================================
                 PRESERVE WORKSPACE
              ===================================== */

              if (
                preserveWorkspace &&
                (
                  lower.includes("workspace") ||
                  lower.includes("project") ||
                  lower.includes("dexie") ||
                  lower.includes("opfs")
                )
              ) {

                console.log(
                  "[CACHE] Preserving workspace DB:",
                  dbName
                );

                return;
              }

              try {

                await new Promise<void>(
                  (
                    resolve,
                    reject
                  ) => {

                    const req =
                      indexedDB.deleteDatabase(
                        dbName
                      );

                    req.onsuccess =
                      () => resolve();

                    req.onerror =
                      () =>
                        reject(req.error);

                    req.onblocked =
                      () => {

                        console.warn(
                          "[CACHE] Delete blocked:",
                          dbName
                        );

                        resolve();
                      };
                  }
                );

                console.log(
                  "[CACHE] Deleted DB:",
                  dbName
                );

              } catch (err) {

                console.warn(
                  "[CACHE] Failed deleting DB:",
                  dbName,
                  err
                );
              }
            })
          );
        }

      } catch (err) {

        console.warn(
          "[CACHE] IndexedDB cleanup failed",
          err
        );
      }
    }

    /* =====================================================
       OPTIONAL GC HINT
    ===================================================== */

    try {

      // @ts-ignore
      globalThis.gc?.();

    } catch {}

    console.log(
      "[CACHE] Full reset completed."
    );

  } catch (err) {

    console.error(
      "[CACHE] Reset error:",
      err
    );
  }
}
