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
  id?: string;
  title: string;
  lessons: any[];
  timestamp?: number;
}

export interface AppError {
  id?: number;
  message: string;
  timestamp: number;
}

export interface Explanation {
  id?: number;
  text: string;
  timestamp: number;
}

// 1. Definição da Classe do Banco
class CodeAscensionDB extends Dexie {
  user!: Table<User>;
  courses!: Table<Course>;
  errors!: Table<AppError>;
  explanations!: Table<Explanation>;
  shop!: Table<any>;
  daily!: Table<any>;
  memory!: Table<any>;

  constructor() {
    super("codeascent_db");
    
    // Define o esquema. 
    // O primeiro campo é a Primary Key. '++' significa auto-incremento.
    // Campos após a vírgula são índices (para busca rápida e cleanup).
    this.version(1).stores({
      user: 'id',
      courses: 'id',
      errors: '++id, timestamp',
      explanations: '++id, timestamp',
      shop: 'id',
      daily: 'id',
      memory: 'id, timestamp'
    });
  }
}

export const db = new CodeAscensionDB();

/**
 * CONSTANTES DE LIMPEZA
 */
const MAX_LOG_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
const MAX_EXPLANATIONS = 50;
const MAX_ERRORS = 30;

/**
 * LÓGICA DE CLEANUP (AUTO-DELETE)
 * Muito mais simples e performática com Dexie
 */
export async function cleanupOldData() {
  const now = Date.now();
  const threshold = now - MAX_LOG_AGE_MS;

  try {
    // Deleta por tempo usando os índices que criamos
    await db.errors.where('timestamp').below(threshold).delete();
    await db.memory.where('timestamp').below(threshold).delete();
    
    // Limita quantidade total (Cap)
    const expCount = await db.explanations.count();
    if (expCount > MAX_EXPLANATIONS) {
      await db.explanations
        .orderBy('id')
        .limit(expCount - MAX_EXPLANATIONS)
        .delete();
    }

    console.log(" [Cleanup] Manutenção concluída com sucesso.");
  } catch (err) {
    console.error(" [Cleanup] Erro na manutenção:", err);
  }
}

/**
 * WRAPPERS COMPATÍVEIS (Para não quebrar o resto do app)
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

// ✅ GENERIC SAVE (Injeta timestamp automaticamente)
export async function save(storeName: string, value: any, key: string = "main") {
  try {
    const table = (db as any)[storeName];
    
    const dataToSave = typeof value === 'object' 
      ? { ...value, id: key, timestamp: Date.now() } 
      : value;

    await table.put(dataToSave);

    // Background cleanup (10% de chance)
    if (Math.random() < 0.1) cleanupOldData();
    
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

// ✅ UPDATE USER (O Mutex agora é tratado internamente pelo Dexie na transação)
export async function updateUser(updates: any) {
  return await db.transaction('rw', db.user, async () => {
    const current = await db.user.get('main') || {};
    const merged = { ...current, ...updates, id: 'main' };
    await db.user.put(merged);
    return merged;
  });
}

/**
 * MANUTENÇÃO COMPLETA
 */
export async function performStorageCleanup() {
  console.log(" [System] Iniciando manutenção...");
  await cleanupOldData();
  
  // Limpeza de cursos inválidos
  await db.courses
    .filter(c => !c.lessons || c.lessons.length === 0)
    .delete();
}

/**
 * HOOK PARA O FRONTEND
 */
export function useAutoCleanup() {
  return performStorageCleanup;
}