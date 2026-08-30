import { Word, RELATION_TAGS, RelationTag } from '../types';

const LEGACY_STORAGE_KEYS = [
  'whos_the_spy_dictionary_words_v3',
  'whos_the_spy_dictionary_words_v2',
  'whos_the_spy_dictionary_words',
];

// Legacy tag mapping for backwards compatibility
const LEGACY_TAG_MAP: Record<string, RelationTag> = {
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

/**
 * Strict data deduplication and graph normalization engine.
 * - Merges duplicate word entries sharing identical normalized terms.
 * - Remaps all edges across the graph to point to canonical IDs.
 * - Removes self-referential relations (word linked to itself).
 * - Removes invalid relations pointing to non-existent words.
 * - Deduplicates duplicate relation tags between identical word pairs.
 * - Guarantees strict bidirectional symmetry.
 */
export function deduplicateWords(inputWords: Word[]): Word[] {
  if (!Array.isArray(inputWords) || inputWords.length === 0) {
    return [];
  }

  // 1. Group entities by normalized term
  const termToCanonicalMap = new Map<string, { id: string; term: string; createdAt: number; updatedAt: number }>();
  const idToCanonicalIdMap = new Map<string, string>();

  // First pass: establish canonical ID for each unique normalized term
  for (const w of inputWords) {
    if (!w || typeof w.term !== 'string') continue;
    const cleanTerm = w.term.trim();
    if (!cleanTerm) continue;

    const normKey = cleanTerm.toLowerCase();
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

  // 2. Aggregate unique mutual pairs without double data
  // Key format: [canonicalIdA, canonicalIdB].sort().join('::') + '::' + tag
  const uniqueMutualLinks = new Map<string, { idA: string; idB: string; tag: RelationTag }>();
  const validTags = new Set(RELATION_TAGS);

  for (const w of inputWords) {
    if (!w || !w.id || !Array.isArray(w.relations)) continue;
    const sourceCanonicalId = idToCanonicalIdMap.get(w.id);
    if (!sourceCanonicalId) continue;

    for (const r of w.relations) {
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
        tag = 'others';
      }

      const pairKey = [sourceCanonicalId, targetCanonicalId].sort().join('::') + '::' + tag;
      if (!uniqueMutualLinks.has(pairKey)) {
        uniqueMutualLinks.set(pairKey, {
          idA: sourceCanonicalId,
          idB: targetCanonicalId,
          tag,
        });
      }
    }
  }

  // 3. Build finalized canonical words map
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

  // 4. Attach bidirectional relation entries
  uniqueMutualLinks.forEach((link) => {
    const wordA = resultMap.get(link.idA);
    const wordB = resultMap.get(link.idB);

    if (wordA && wordB) {
      wordA.relations.push({ targetWordId: wordB.id, tag: link.tag });
      wordB.relations.push({ targetWordId: wordA.id, tag: link.tag });
    }
  });

  // 5. Sort relations deterministically by term and return sorted list
  const finalWords = Array.from(resultMap.values());

  finalWords.forEach((word) => {
    word.relations.sort((a, b) => {
      const termA = resultMap.get(a.targetWordId)?.term || '';
      const termB = resultMap.get(b.targetWordId)?.term || '';
      return termA.localeCompare(termB, undefined, { sensitivity: 'base' });
    });
  });

  return finalWords.sort((a, b) =>
    a.term.localeCompare(b.term, undefined, { sensitivity: 'base' })
  );
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
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid JSON format';
    return {
      success: false,
      error: `Failed to parse JSON: ${message}`,
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

/**
 * Resets the active dictionary words state.
 */
export function clearAllWords(): Word[] {
  cleanupLegacyLocalStorage();
  return [];
}


