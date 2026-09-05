import { Word } from '../types';
import { deduplicateWords } from './storage';

export const LOCAL_DB_KEY = 'whos_the_spy_local_db_v1';

export interface LocalDatabaseRecord {
  words: Word[];
  updatedAt: number; // epoch timestamp in ms
  version: string;
}

/**
 * Loads the local temporary database from localStorage.
 * Returns null if not present or corrupt.
 */
export function getLocalDatabase(): LocalDatabaseRecord | null {
  try {
    const raw = localStorage.getItem(LOCAL_DB_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.words)) return null;

    const words = deduplicateWords(parsed.words);
    const updatedAt = typeof parsed.updatedAt === 'number' && parsed.updatedAt > 0
      ? parsed.updatedAt
      : Date.now();

    return {
      words,
      updatedAt,
      version: typeof parsed.version === 'string' ? parsed.version : '1.0.0',
    };
  } catch (err) {
    console.warn('Failed to read local database from localStorage:', err);
    return null;
  }
}

/**
 * Saves words and timestamp to the local database.
 * Returns the recorded timestamp.
 */
export function saveLocalDatabase(words: Word[], timestamp: number = Date.now()): number {
  try {
    const clean = deduplicateWords(words);
    const record: LocalDatabaseRecord = {
      words: clean,
      updatedAt: timestamp,
      version: '1.0.0',
    };
    localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(record));
    return timestamp;
  } catch (err) {
    console.warn('Failed to write to local database:', err);
    return timestamp;
  }
}

/**
 * Completely purges the local database record.
 */
export function clearLocalDatabase(): void {
  try {
    localStorage.removeItem(LOCAL_DB_KEY);
  } catch (err) {
    console.warn('Failed to clear local database:', err);
  }
}
