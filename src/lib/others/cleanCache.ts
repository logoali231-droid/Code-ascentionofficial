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

export async function resetAppAndClearData() {
  try {
    // 1. Limpa todas as storages básicas
    localStorage.clear();
    sessionStorage.clear();

    // 2. Limpa o Cache Storage (onde o WebLLM guarda os modelos/pesos)
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }

    // 3. Limpa o IndexedDB (bancos de dados do navegador)
    if ('indexedDB' in window) {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name) indexedDB.deleteDatabase(db.name);
      }
    }

    // 4. Remove o Service Worker do PWA para evitar cache de scripts antigos
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }

    // 5. Recarrega a página limpando o cache do navegador
    window.location.reload();
    
  } catch (error) {
    console.error("Erro ao limpar dados do site:", error);
    // Força o reload mesmo se algo falhar
    window.location.reload(); 
  }
}

