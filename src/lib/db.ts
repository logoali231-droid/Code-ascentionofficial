import Dexie, { type Table } from 'dexie';


/**
 * CONFIGURAÇÃO DO BANCO DE DADOS (DEXIE)
 */
export interface User {
  id?: string;
  name?: string;
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
  question?: string; // Adicionado para compatibilidade com o log de exercícios
  courseId?: string; // Adicionado para o índice de busca
  timestamp: number;
  [key: string]: any;
}



export interface Explanation {
  id?: number;
  text: string;
  timestamp: number;
}

// 1. Definição da Classe do Banco
// Adicione essa interface junto com as outras
export interface TelemetryMetric {
  id?: number;
  type: "execution_time" | "memory_leak" | "engine_fault" | "bundle_time";
  engine: string;
  language: string;
  duration: number;
  success: boolean;
  timestamp: number;
}

class CodeAscensionDB extends Dexie {
  user!: Table<User>;
  courses!: Table<Course>;
  errors!: Table<AppError>;
  explanations!: Table<Explanation>;
  shop!: Table<any>;
  daily!: Table<any>;
  memory!: Table<any>;
  curriculum!: Table<any>;
  // 1. Declarar a nova tabela
  telemetry!: Table<TelemetryMetric>;

  constructor() {
    super("codeascent_db");

    // 2. Registrar a tabela na versão atual (Subindo para a versão 3 se necessário)
    this.version(3).stores({
      user: 'id',
      courses: 'id',
      errors: '++id, timestamp, courseId',
      explanations: '++id, timestamp',
      shop: 'id',
      daily: 'id',
      memory: 'id, timestamp',
      curriculum: 'courseId, updatedAt',
      telemetry: '++id, timestamp, type' // Índice por tipo e timestamp para futuras análises
    });
  }
}

export const db = new CodeAscensionDB();

// 3. Função de escrita em lote de alta performance
export async function saveTelemetryBatch(metrics: TelemetryMetric[]): Promise<boolean> {
  if (metrics.length === 0) return true;
  try {
    // bulkAdd ignora travas de registros individuais, ideal para telemetria em lote
    await db.telemetry.bulkAdd(metrics);
    return true;
  } catch (e) {
    console.error("[Telemetry DB] Falha ao persistir lote de telemetria:", e);
    return false;
  }
}

// ... Resto do seu arquivo db.ts permanece idêntico


/**
 * CONSTANTES DE MANUTENÇÃO REFINADAS
 */
const MAX_LOG_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias (Explicações e Logs)
const MAX_EXPLANATIONS_TOTAL = 100; // Limite de registros para evitar lentidão no index
const MAX_ERRORS_TOTAL = 50;

/**
 * LÓGICA DE CLEANUP (AUTO-DELETE)
 */


export async function cleanupOldData() {
  const now = Date.now();
  const expirationThreshold = now - MAX_LOG_AGE_MS;

  try {
    const deletedExplanations = await db.explanations
      .where('timestamp')
      .below(expirationThreshold)
      .delete();

    await db.errors.where('timestamp').below(expirationThreshold).delete();
    await db.memory.where('timestamp').below(expirationThreshold).delete();

    const currentExpCount = await db.explanations.count();
    if (currentExpCount > MAX_EXPLANATIONS_TOTAL) {
      const overflow = currentExpCount - MAX_EXPLANATIONS_TOTAL;
      await db.explanations
        .orderBy('timestamp')
        .limit(overflow)
        .delete();
    }

    const currentErrorCount = await db.errors.count();
    if (currentErrorCount > MAX_ERRORS_TOTAL) {
      await db.errors
        .orderBy('timestamp')
        .limit(currentErrorCount - MAX_ERRORS_TOTAL)
        .delete();
    }

    console.log(`[Cleanup] Manutenção concluída. Registros expirados removidos.`);
  } catch (err) {
    console.error("[Cleanup] Falha crítica na manutenção do DB:", err);
  }
}


export async function addBannedTerm(term: string) {
  // Busca o registro principal do usuário (onde ficam as settings)
  const settings = await get<User>("user", "main") || {};
  
  // Garante que customBanned seja um array
  const currentBanned: string[] = settings.customBanned || [];
  
  if (!currentBanned.includes(term)) {
    // Atualiza usando a função save que você já tem no arquivo
    await save("user", {
      ...settings,
      customBanned: [...currentBanned, term]
    }, "main");
    
    console.log(`[Protocol] Termo "${term}" injetado na lista de restrições.`);
  }
}



/**
 * NOVAS FUNÇÕES REQUISITADAS PELO COURSE PAGE
 */

// Busca logs de erro de um curso específico
export async function getErrorLogs(courseId: string): Promise<AppError[]> {
  try {
    return await db.errors
      .where('courseId')
      .equals(courseId)
      .toArray();
  } catch (e) {
    console.error("Erro ao buscar logs de erro:", e);
    return [];
  }
}

// Remove um log de erro específico após o reforço
export async function clearErrorLog(id: number) {
  try {
    await db.errors.delete(id);
    return true;
  } catch (e) {
    console.error("Erro ao deletar log de erro:", e);
    return false;
  }
}

/**
 * WRAPPERS COMPATÍVEIS
 */

// ✅ GENERIC GET
export async function get<T = any>(storeName: string, key: string): Promise<T | null> {
  try {
    const table = (db as any)[storeName];
    const result = await table.get(key);
    return result || null;
  } catch (e) {
    return null;
  }
}

// ✅ GENERIC SAVE
export async function save(storeName: string, value: any, key: string = "main") {
  try {
    const table = (db as any)[storeName];

    const dataToSave = typeof value === 'object'
      ? { ...value, id: key, timestamp: Date.now() }
      : value;

    await table.put(dataToSave);

    // ❌ REMOVIDO: if (Math.random() < 0.1) cleanupOldData();

    return true;
  } catch (e) {
    console.error(`Erro ao salvar em ${storeName}:`, e);
    return false;
  }
}

// ✅ GENERIC GET ALL
export async function getAll(storeName: string) {
  try {
    const table = (db as any)[storeName];
    return await table.toArray();
  } catch (e) {
    return [];
  }
}

// ✅ HELPERS DE REGISTRO
export async function getRecord<T = any>(store: string, id?: string | number): Promise<T | null> {
  return get<T>(store, id !== undefined ? String(id) : "main");
}

export async function saveRecord(store: string, value: any, id?: string | number) {
  return save(store, value, id !== undefined ? String(id) : "main");
}

// ✅ UPDATE USER
export async function updateUser(updates: any) {
  return await db.transaction('rw', db.user, async () => {
    const current = await db.user.get('main') || {};
    const merged = { ...current, ...updates, id: 'main' };
    await db.user.put(merged);
    return merged;
  });
}

/*
 * MANUTENÇÃO COMPLETA DETERMINÍSTICA
 */
export async function performStorageCleanup() {
  console.log("⚙️ [System] Iniciando ciclo de manutenção determinística...");
  
  // 1. Executa a limpeza padrão de logs e tabelas estáticas
  await cleanupOldData();

  // 2. Remove cursos inválidos
  await db.courses
    .filter(c => !c.lessons || c.lessons.length === 0)
    .delete();

  // 3. Injeta dinamicamente a limpeza do VectorMemory de forma assíncrona
  try {
    const { cleanupVectorMemory } = await import("./vectorMemory");
    await cleanupVectorMemory();
  } catch (err) {
    console.error("[System] Erro ao processar sub-rotina de Vector Memory:", err);
  }

  console.log("✅ [System] Ciclo de vida de auto-cleanup concluído com sucesso.");
}

/**
 * HOOK PARA O FRONTEND
 */
export function useAutoCleanup() {
  return performStorageCleanup;
}

export async function getUser(): Promise<User | null> {
  try {
    return await db.user.get('main') || null;
  } catch (e) {
    return null;
  }
}
