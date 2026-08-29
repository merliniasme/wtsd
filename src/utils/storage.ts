import { Word, RELATION_TAGS, RelationTag } from '../types';

const STORAGE_KEY = 'whos_the_spy_dictionary_words_v3';

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

export function loadWords(): Word[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Start website from 0 words by default
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return sanitizeWords(parsed);
    }
    return [];
  } catch (error) {
    console.error('Failed to load words from localStorage:', error);
    return [];
  }
}

export function saveWords(words: Word[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  } catch (error) {
    console.error('Failed to save words to localStorage:', error);
  }
}

export function clearAllWords(): Word[] {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  } catch (error) {
    console.error('Failed to clear words in localStorage:', error);
  }
  return [];
}

export function exportWordsJson(words: Word[]): string {
  const data = {
    appName: "Spy Dictionary",
    version: '3.0.0',
    exportedAt: new Date().toISOString(),
    totalWords: words.length,
    words,
  };
  return JSON.stringify(data, null, 2);
}

export function triggerDownloadBackup(words: Word[]): boolean {
  try {
    const jsonString = exportWordsJson(words);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `spy-dictionary-backup-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Download backup failed:', err);
    return false;
  }
}

export function validateAndImportJson(
  jsonString: string,
  existingWords: Word[] = [],
  mode: 'replace' | 'merge' = 'replace'
): {
  success: boolean;
  words?: Word[];
  error?: string;
  importedCount?: number;
} {
  try {
    const parsed = JSON.parse(jsonString);
    let candidateWords: unknown;

    if (Array.isArray(parsed)) {
      candidateWords = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray((parsed as Record<string, unknown>).words)) {
      candidateWords = (parsed as Record<string, unknown>).words;
    } else {
      return {
        success: false,
        error: 'Invalid file format: JSON must contain an array of words or a { "words": [...] } object.',
      };
    }

    const sanitizedNew = sanitizeWords(candidateWords as Word[]);
    if (sanitizedNew.length === 0) {
      return {
        success: false,
        error: 'No valid word entities found in imported data.',
      };
    }

    if (mode === 'replace') {
      return {
        success: true,
        words: sanitizedNew,
        importedCount: sanitizedNew.length,
      };
    }

    // Merge Mode: Combine existing words and new imported words
    const mergedMap = new Map<string, Word>();

    // Helper to get or add word by normalized term
    const getOrAddWord = (term: string): Word => {
      const normalized = term.trim().toLowerCase();
      let found = Array.from(mergedMap.values()).find(
        (w) => w.term.trim().toLowerCase() === normalized
      );
      if (!found) {
        const id = 'w_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
        found = {
          id,
          term: term.trim(),
          relations: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        mergedMap.set(id, found);
      }
      return found;
    };

    // 1. Populate existing words
    existingWords.forEach((w) => {
      mergedMap.set(w.id, {
        ...w,
        relations: [...w.relations],
      });
    });

    // 2. Merge imported words & their relations
    sanitizedNew.forEach((newWord) => {
      const targetEntity = getOrAddWord(newWord.term);

      newWord.relations.forEach((rel) => {
        const counterpartInImport = sanitizedNew.find((w) => w.id === rel.targetWordId);
        if (counterpartInImport) {
          const counterpartEntity = getOrAddWord(counterpartInImport.term);
          if (counterpartEntity.id !== targetEntity.id) {
            const exists = targetEntity.relations.some(
              (r) => r.targetWordId === counterpartEntity.id && r.tag === rel.tag
            );
            if (!exists) {
              targetEntity.relations.push({
                targetWordId: counterpartEntity.id,
                tag: rel.tag,
              });
            }
          }
        }
      });
    });

    const finalMerged = sanitizeWords(Array.from(mergedMap.values()));

    return {
      success: true,
      words: finalMerged,
      importedCount: finalMerged.length,
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
  const validTags = new Set(RELATION_TAGS);
  const result: Word[] = [];

  for (const item of rawList) {
    if (!item || typeof item !== 'object') continue;
    const w = item as Record<string, unknown>;
    if (typeof w.id !== 'string' || !w.id.trim()) continue;
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

    result.push({
      id: w.id.trim(),
      term: w.term.trim(),
      relations,
      createdAt: typeof w.createdAt === 'number' ? w.createdAt : Date.now(),
      updatedAt: typeof w.updatedAt === 'number' ? w.updatedAt : Date.now(),
    });
  }

  // Ensure bidirectional consistency across all words
  const wordMap = new Map<string, Word>(result.map((w) => [w.id, { ...w, relations: [...w.relations] }]));

  wordMap.forEach((word) => {
    word.relations.forEach((rel) => {
      const target = wordMap.get(rel.targetWordId);
      if (target) {
        const hasReciprocal = target.relations.some(
          (r) => r.targetWordId === word.id && r.tag === rel.tag
        );
        if (!hasReciprocal) {
          target.relations.push({ targetWordId: word.id, tag: rel.tag });
        }
      }
    });
  });

  return Array.from(wordMap.values());
}
