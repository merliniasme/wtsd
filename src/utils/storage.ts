import { Word, RELATION_TAGS, RelationTag, LocalBackupSnapshot } from '../types';
import { calculateTotalRelations } from './wordGraph';

const LEGACY_STORAGE_KEYS = [
  'whos_the_spy_dictionary_words_v3',
  'whos_the_spy_dictionary_words_v2',
  'whos_the_spy_dictionary_words',
];

// Legacy tag mapping for backwards compatibility
const LEGACY_TAG_MAP: Record<string, RelationTag> = {
  unknown: 'unknown',
  anime: 'mag',
  celebrity: 'ectm',
  humaniora: 'cghn',
  hardcore: 'aoh',
  everyday: 'others',
  others: 'others',
  cghn: 'cghn',
  mag: 'mag',
  ectm: 'ectm',
  aoh: 'aoh',
};

/**
 * Completely purges all legacy offline localStorage caches to ensure pure online sync.
 */
export function cleanupLegacyLocalStorage(): void {
  try {
    for (const key of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
  } catch (error) {
    console.warn('LocalStorage cleanup skipped:', error);
  }
}

// Fast reusable Intl.Collator instance
const fastCollator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

/**
 * Strict data deduplication and graph normalization engine.
 * - Merges duplicate word entries sharing identical exact case-sensitive terms.
 * - Remaps all edges across the graph to point to canonical IDs.
 * - Removes self-referential relations (word linked to itself).
 * - Removes invalid relations pointing to non-existent words.
 * - Preserves different relation tags for identical word pairs.
 * - Replaces 'unknown' tag when a specific relation tag is assigned.
 * - Guarantees strict bidirectional symmetry.
 * - High performance optimized for 5,000+ words.
 */
export function deduplicateWords(inputWords: Word[]): Word[] {
  if (!Array.isArray(inputWords) || inputWords.length === 0) {
    return [];
  }

  // 1. Group entities by exact term (case-sensitive exact match)
  const termToCanonicalMap = new Map<string, { id: string; term: string; createdAt: number; updatedAt: number }>();
  const idToCanonicalIdMap = new Map<string, string>();

  // First pass: establish canonical ID for each unique exact term
  for (let i = 0; i < inputWords.length; i++) {
    const w = inputWords[i];
    if (!w || typeof w.term !== 'string') continue;
    const cleanTerm = w.term.trim();
    if (!cleanTerm) continue;

    const normKey = cleanTerm; // Case-sensitive exact match
    const existing = termToCanonicalMap.get(normKey);

    if (!existing) {
      const canonicalId = typeof w.id === 'string' && w.id.trim() ? w.id.trim() : 'w_' + Math.random().toString(36).substring(2, 9);
      termToCanonicalMap.set(normKey, {
        id: canonicalId,
        term: cleanTerm,
        createdAt: typeof w.createdAt === 'number' ? w.createdAt : Date.now(),
        updatedAt: typeof w.updatedAt === 'number' ? w.updatedAt : Date.now(),
      });
      if (typeof w.id === 'string') {
        idToCanonicalIdMap.set(w.id, canonicalId);
      }
    } else {
      if (typeof w.id === 'string') {
        idToCanonicalIdMap.set(w.id, existing.id);
      }
      // Preserve earliest created date and latest updated date
      if (typeof w.createdAt === 'number' && w.createdAt < existing.createdAt) {
        existing.createdAt = w.createdAt;
      }
      if (typeof w.updatedAt === 'number' && w.updatedAt > existing.updatedAt) {
        existing.updatedAt = w.updatedAt;
      }
    }
  }

  // 2. Aggregate unique mutual pairs and their tags
  const pairTagsMap = new Map<string, { idA: string; idB: string; tags: Set<RelationTag> }>();
  const validTags = new Set(RELATION_TAGS);

  for (let i = 0; i < inputWords.length; i++) {
    const w = inputWords[i];
    if (!w || !w.id || !Array.isArray(w.relations)) continue;
    const sourceCanonicalId = idToCanonicalIdMap.get(w.id);
    if (!sourceCanonicalId) continue;

    const rels = w.relations;
    for (let j = 0; j < rels.length; j++) {
      const r = rels[j];
      if (!r || typeof r.targetWordId !== 'string') continue;
      const targetCanonicalId = idToCanonicalIdMap.get(r.targetWordId);

      // Skip self-referential links or links pointing to unknown words
      if (!targetCanonicalId || sourceCanonicalId === targetCanonicalId) {
        continue;
      }

      let tag: RelationTag | undefined;
      if (typeof r.tag === 'string') {
        const rawTag = r.tag.trim();
        if (validTags.has(rawTag as RelationTag)) {
          tag = rawTag as RelationTag;
        } else if (LEGACY_TAG_MAP[rawTag]) {
          tag = LEGACY_TAG_MAP[rawTag];
        }
      }

      if (!tag) {
        tag = 'unknown';
      }

      const isSourceFirst = sourceCanonicalId < targetCanonicalId;
      const idA = isSourceFirst ? sourceCanonicalId : targetCanonicalId;
      const idB = isSourceFirst ? targetCanonicalId : sourceCanonicalId;
      const pairBaseKey = `${idA}::${idB}`;

      let entry = pairTagsMap.get(pairBaseKey);
      if (!entry) {
        entry = { idA, idB, tags: new Set<RelationTag>() };
        pairTagsMap.set(pairBaseKey, entry);
      }

      entry.tags.add(tag);
    }
  }

  // 3. For any pair with both 'unknown' and specific tags, remove 'unknown'
  pairTagsMap.forEach((entry) => {
    if (entry.tags.size > 1 && entry.tags.has('unknown')) {
      entry.tags.delete('unknown');
    }
  });

  // 4. Build finalized canonical words map
  const resultMap = new Map<string, Word>();

  termToCanonicalMap.forEach((entry) => {
    resultMap.set(entry.id, {
      id: entry.id,
      term: entry.term,
      relations: [],
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    });
  });

  // 5. Attach bidirectional relation entries for each distinct tag
  pairTagsMap.forEach((entry) => {
    const wordA = resultMap.get(entry.idA);
    const wordB = resultMap.get(entry.idB);

    if (wordA && wordB) {
      entry.tags.forEach((tag) => {
        wordA.relations.push({ targetWordId: wordB.id, tag });
        wordB.relations.push({ targetWordId: wordA.id, tag });
      });
    }
  });

  // 6. Sort relations deterministically by term and return sorted list using fastCollator
  const finalWords = Array.from(resultMap.values());

  for (let i = 0; i < finalWords.length; i++) {
    const word = finalWords[i];
    word.relations.sort((a, b) => {
      const termA = resultMap.get(a.targetWordId)?.term || '';
      const termB = resultMap.get(b.targetWordId)?.term || '';
      return fastCollator.compare(termA, termB);
    });
  }

  return finalWords.sort((a, b) => fastCollator.compare(a.term, b.term));
}

export interface DictionaryCloudPayload {
  appName: string;
  version: string;
  lastModified: number; // Unix timestamp in ms
  exportedAt: string;
  totalWords: number;
  words: Word[];
}

/**
 * Serializes dictionary words to validated JSON for Google Drive cloud sync with accurate session timestamp.
 */
export function exportWordsJson(words: Word[], sessionTimestamp: number = Date.now()): string {
  const cleanWords = deduplicateWords(words);
  const data: DictionaryCloudPayload = {
    appName: "Spy Dictionary",
    version: '3.1.0',
    lastModified: sessionTimestamp,
    exportedAt: new Date(sessionTimestamp).toISOString(),
    totalWords: cleanWords.length,
    words: cleanWords,
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Validates and parses JSON from the verified Google Drive database file.
 */
export function validateAndImportJson(
  jsonString: string,
  existingWords: Word[] = [],
  mode: 'replace' | 'merge' = 'replace'
): {
  success: boolean;
  words?: Word[];
  lastModified?: number;
  error?: string;
  importedCount?: number;
  pairCount?: number;
} {
  try {
    const parsed = JSON.parse(jsonString);
    let candidateWords: unknown;
    let fileLastModified: number = Date.now();

    if (Array.isArray(parsed)) {
      candidateWords = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).words)) {
      candidateWords = (parsed as Record<string, unknown>).words;
      if (typeof (parsed as Record<string, unknown>).lastModified === 'number') {
        fileLastModified = (parsed as Record<string, unknown>).lastModified as number;
      } else if (typeof (parsed as Record<string, unknown>).exportedAt === 'string') {
        fileLastModified = new Date((parsed as Record<string, unknown>).exportedAt as string).getTime() || Date.now();
      }
    } else {
      return {
        success: false,
        error: 'Invalid file format: JSON must contain an array of words or a { "words": [...] } object.',
      };
    }

    const sanitizedNew = sanitizeWords(candidateWords as Word[]);
    if (sanitizedNew.length === 0 && candidateWords && Array.isArray(candidateWords) && candidateWords.length > 0) {
      return {
        success: false,
        error: 'No valid word entities found in data.',
      };
    }

    if (mode === 'replace') {
      const deduplicated = deduplicateWords(sanitizedNew);
      return {
        success: true,
        words: deduplicated,
        lastModified: fileLastModified,
        importedCount: deduplicated.length,
        pairCount: calculateTotalRelations(deduplicated),
      };
    }

    // Merge Mode: Combine existing words and new imported words with timestamp prioritization
    const combined = [...existingWords, ...sanitizedNew];
    const mergedWords = deduplicateWords(combined);

    return {
      success: true,
      words: mergedWords,
      lastModified: fileLastModified,
      importedCount: mergedWords.length,
      pairCount: calculateTotalRelations(mergedWords),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid JSON format';
    return {
      success: false,
      error: `Failed to parse JSON: ${message}`,
    };
  }
}

/**
 * Previews/inspects a JSON backup string without committing changes.
 */
export function inspectBackupJson(jsonString: string): {
  success: boolean;
  words?: Word[];
  totalWords?: number;
  totalPairs?: number;
  lastModified?: number;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    let candidateWords: unknown;
    let fileLastModified: number = Date.now();

    if (Array.isArray(parsed)) {
      candidateWords = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).words)) {
      candidateWords = (parsed as Record<string, unknown>).words;
      if (typeof (parsed as Record<string, unknown>).lastModified === 'number') {
        fileLastModified = (parsed as Record<string, unknown>).lastModified as number;
      } else if (typeof (parsed as Record<string, unknown>).exportedAt === 'string') {
        fileLastModified = new Date((parsed as Record<string, unknown>).exportedAt as string).getTime() || Date.now();
      }
    } else {
      return {
        success: false,
        error: 'Invalid file format: JSON must contain an array of words or a { "words": [...] } object.',
      };
    }

    const sanitized = sanitizeWords(candidateWords as Word[]);
    if (sanitized.length === 0 && candidateWords && Array.isArray(candidateWords) && candidateWords.length > 0) {
      return {
        success: false,
        error: 'No valid words found in the backup file.',
      };
    }

    const deduplicated = deduplicateWords(sanitized);
    const pairs = calculateTotalRelations(deduplicated);

    return {
      success: true,
      words: deduplicated,
      totalWords: deduplicated.length,
      totalPairs: pairs,
      lastModified: fileLastModified,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid JSON format';
    return {
      success: false,
      error: `Could not parse file: ${msg}`,
    };
  }
}

export function sanitizeWords(rawList: unknown[]): Word[] {
  if (!Array.isArray(rawList)) return [];
  const validTags = new Set(RELATION_TAGS);
  const result: Word[] = [];

  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue;
    const w = item as Record<string, unknown>;
    if (typeof w.term !== 'string' || !w.term.trim()) continue;

    const relations: Word['relations'] = [];
    if (Array.isArray(w.relations)) {
      for (const r of w.relations) {
        if (!r || typeof r !== 'object') continue;
        const rel = r as Record<string, unknown>;
        if (typeof rel.targetWordId === 'string' && rel.targetWordId.trim() && typeof rel.tag === 'string') {
          const rawTag = rel.tag.trim();
          let resolvedTag: RelationTag | undefined;

          if (validTags.has(rawTag as RelationTag)) {
            resolvedTag = rawTag as RelationTag;
          } else if (LEGACY_TAG_MAP[rawTag]) {
            resolvedTag = LEGACY_TAG_MAP[rawTag];
          }

          if (resolvedTag) {
            relations.push({
              targetWordId: rel.targetWordId.trim(),
              tag: resolvedTag,
            });
          }
        }
      }
    }

    const wordId = typeof w.id === 'string' && w.id.trim()
      ? w.id.trim()
      : 'w_' + Math.random().toString(36).substring(2, 9);

    result.push({
      id: wordId,
      term: w.term.trim(),
      relations,
      createdAt: typeof w.createdAt === 'number' ? w.createdAt : Date.now(),
      updatedAt: typeof w.updatedAt === 'number' ? w.updatedAt : Date.now(),
    });
  }

  return deduplicateWords(result);
}

export const ACTIVE_DICTIONARY_STORAGE_KEY = 'whos_the_spy_active_dictionary_v4';

/**
 * Saves words to local persistent storage for instant loading on app open.
 */
export function saveActiveWordsToLocal(words: Word[]): void {
  try {
    if (!words || words.length === 0) {
      localStorage.removeItem(ACTIVE_DICTIONARY_STORAGE_KEY);
      return;
    }
    const clean = deduplicateWords(words);
    localStorage.setItem(ACTIVE_DICTIONARY_STORAGE_KEY, JSON.stringify(clean));
  } catch (err) {
    console.warn('Could not save dictionary to local cache:', err);
  }
}

/**
 * Loads words from local persistent storage.
 */
export function loadActiveWordsFromLocal(): Word[] {
  try {
    const raw = localStorage.getItem(ACTIVE_DICTIONARY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return sanitizeWords(parsed);
    }
  } catch (err) {
    console.warn('Could not load dictionary from local cache:', err);
  }
  return [];
}

/**
 * Resets the active dictionary words state and purges local active cache.
 */
export function clearAllWords(): Word[] {
  cleanupLegacyLocalStorage();
  try {
    localStorage.removeItem(ACTIVE_DICTIONARY_STORAGE_KEY);
  } catch {
    // ignore
  }
  return [];
}

export const LOCAL_SNAPSHOTS_STORAGE_KEY = 'whos_the_spy_local_snapshots_v1';
const MAX_SNAPSHOTS = 20;

/**
 * Loads all locally saved backup snapshots from localStorage.
 */
export function loadLocalSnapshots(): LocalBackupSnapshot[] {
  try {
    const raw = localStorage.getItem(LOCAL_SNAPSHOTS_STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (Array.isArray(list)) {
      return list.sort((a, b) => b.createdAt - a.createdAt);
    }
  } catch (err) {
    console.warn('Error reading local snapshots:', err);
  }
  return [];
}

/**
 * Saves a named or automatic local backup snapshot to localStorage.
 */
export function saveLocalSnapshot(words: Word[], customName?: string): LocalBackupSnapshot {
  const snapshots = loadLocalSnapshots();
  const cleanWords = deduplicateWords(words);
  const now = Date.now();
  const dateFormatted = new Date(now).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const name = customName?.trim() || `Backup (${dateFormatted})`;

  const newSnapshot: LocalBackupSnapshot = {
    id: 'snap_' + now + '_' + Math.random().toString(36).substring(2, 7),
    name,
    createdAt: now,
    wordCount: cleanWords.length,
    pairCount: calculateTotalRelations(cleanWords),
    words: cleanWords,
  };

  const updated = [newSnapshot, ...snapshots.filter((s) => s.id !== newSnapshot.id)].slice(0, MAX_SNAPSHOTS);
  try {
    localStorage.setItem(LOCAL_SNAPSHOTS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Error saving local snapshot:', err);
  }
  return newSnapshot;
}

/**
 * Deletes a specific local snapshot.
 */
export function deleteLocalSnapshot(snapshotId: string): LocalBackupSnapshot[] {
  const snapshots = loadLocalSnapshots();
  const updated = snapshots.filter((s) => s.id !== snapshotId);
  try {
    localStorage.setItem(LOCAL_SNAPSHOTS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Error deleting local snapshot:', err);
  }
  return updated;
}

/**
 * Clears all local backup snapshots.
 */
export function clearAllLocalSnapshots(): void {
  try {
    localStorage.removeItem(LOCAL_SNAPSHOTS_STORAGE_KEY);
  } catch (err) {
    console.warn('Error clearing local snapshots:', err);
  }
}

/**
 * Downloads a backup file (.json) to the user's device.
 */
export function downloadBackupJsonFile(words: Word[], customFilename?: string): void {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  const filename = customFilename?.trim() || `spy-dictionary-backup-${dateStr}_${timeStr}.json`;

  const jsonContent = exportWordsJson(words);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copies the raw backup JSON to user's clipboard.
 */
export async function copyBackupJsonToClipboard(words: Word[]): Promise<boolean> {
  const jsonContent = exportWordsJson(words);
  try {
    await navigator.clipboard.writeText(jsonContent);
    return true;
  } catch (err) {
    console.warn('Could not copy to clipboard:', err);
    return false;
  }
}


