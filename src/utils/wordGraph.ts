import { Word, Relation, RelationTag, PairItem } from '../types';

// Reusable fast collator for natural language sorting
const fastCollator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

export function fastStringCompare(a: string, b: string): number {
  if (a === b) return 0;
  return fastCollator.compare(a, b);
}

export function generateId(): string {
  return 'w_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
}

/**
 * Calculates the total number of unique mutual links across all words.
 * Each mutual pair (A <-> B under tag T) counts as 1 relation.
 */
export function calculateTotalRelations(words: Word[]): number {
  const uniqueEdges = new Set<string>();

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wId = word.id;
    const rels = word.relations;
    for (let j = 0; j < rels.length; j++) {
      const rel = rels[j];
      const tId = rel.targetWordId;
      const pairKey = (wId < tId ? `${wId}::${tId}` : `${tId}::${wId}`) + '::' + rel.tag;
      uniqueEdges.add(pairKey);
    }
  }

  return uniqueEdges.size;
}

/**
 * Calculates total relations per tag.
 */
export function calculateRelationsByTag(words: Word[]): Record<RelationTag, number> {
  const counts: Record<RelationTag, number> = {
    unknown: 0,
    others: 0,
    aoh: 0,
    ectm: 0,
    mag: 0,
    cghn: 0,
  };

  const uniqueEdges = new Set<string>();

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wId = word.id;
    const rels = word.relations;
    for (let j = 0; j < rels.length; j++) {
      const rel = rels[j];
      const tId = rel.targetWordId;
      const pairKey = (wId < tId ? `${wId}::${tId}` : `${tId}::${wId}`) + '::' + rel.tag;
      if (!uniqueEdges.has(pairKey)) {
        uniqueEdges.add(pairKey);
        if (counts[rel.tag] !== undefined) {
          counts[rel.tag]++;
        }
      }
    }
  }

  return counts;
}

/**
 * Find word by term (exact case-sensitive match)
 */
export function findWordByTerm(words: Word[], term: string): Word | undefined {
  const clean = term.trim();
  for (let i = 0; i < words.length; i++) {
    if (words[i].term === clean) return words[i];
  }
  return undefined;
}

/**
 * Ensures word exists; creates a new one if not found.
 */
export function getOrCreateWord(
  words: Word[],
  term: string
): { updatedWords: Word[]; word: Word; created: boolean } {
  const trimmed = term.trim();
  const existing = findWordByTerm(words, trimmed);
  if (existing) {
    return { updatedWords: words, word: existing, created: false };
  }

  const newWord: Word = {
    id: generateId(),
    term: trimmed,
    relations: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return {
    updatedWords: [...words, newWord],
    word: newWord,
    created: true,
  };
}

/**
 * Check if a relation already exists between two words with a specific tag
 */
export function hasRelation(
  words: Word[],
  wordIdA: string,
  wordIdB: string,
  tag?: RelationTag
): boolean {
  if (wordIdA === wordIdB) return true;
  const wordA = words.find((w) => w.id === wordIdA);
  if (!wordA) return false;

  for (let i = 0; i < wordA.relations.length; i++) {
    const r = wordA.relations[i];
    if (r.targetWordId === wordIdB) {
      if (!tag || r.tag === tag) return true;
    }
  }
  return false;
}

/**
 * Links two words bidirectionally with automatic mirror update.
 * If linking with a specific tag and an 'unknown' relation exists,
 * 'unknown' is removed and replaced by the new specified tag.
 * If linking with different specific tags, both tags are preserved for the pair.
 */
export function linkWords(
  words: Word[],
  wordIdA: string,
  wordIdB: string,
  tag: RelationTag = 'unknown'
): Word[] {
  if (wordIdA === wordIdB) return words;

  return words.map((w) => {
    if (w.id === wordIdA) {
      // If specifying a non-unknown tag, remove any existing 'unknown' tag relation for this target
      let filteredRelations = w.relations;
      if (tag !== 'unknown') {
        filteredRelations = filteredRelations.filter(
          (r) => !(r.targetWordId === wordIdB && r.tag === 'unknown')
        );
      }

      const alreadyLinked = filteredRelations.some(
        (r) => r.targetWordId === wordIdB && r.tag === tag
      );
      if (alreadyLinked && filteredRelations.length === w.relations.length) return w;

      const finalRelations = alreadyLinked
        ? filteredRelations
        : [...filteredRelations, { targetWordId: wordIdB, tag }];

      return {
        ...w,
        relations: finalRelations,
        updatedAt: Date.now(),
      };
    }

    if (w.id === wordIdB) {
      // If specifying a non-unknown tag, remove any existing 'unknown' tag relation for this target
      let filteredRelations = w.relations;
      if (tag !== 'unknown') {
        filteredRelations = filteredRelations.filter(
          (r) => !(r.targetWordId === wordIdA && r.tag === 'unknown')
        );
      }

      const alreadyLinked = filteredRelations.some(
        (r) => r.targetWordId === wordIdA && r.tag === tag
      );
      if (alreadyLinked && filteredRelations.length === w.relations.length) return w;

      const finalRelations = alreadyLinked
        ? filteredRelations
        : [...filteredRelations, { targetWordId: wordIdA, tag }];

      return {
        ...w,
        relations: finalRelations,
        updatedAt: Date.now(),
      };
    }

    return w;
  });
}

/**
 * Creates or finds two terms and links them bidirectionally.
 */
export function addOrLinkPair(
  words: Word[],
  termA: string,
  termB: string,
  tag: RelationTag = 'unknown'
): { updatedWords: Word[]; wordA: Word; wordB: Word; duplicate: boolean } {
  let currentWords = [...words];

  const resA = getOrCreateWord(currentWords, termA);
  currentWords = resA.updatedWords;
  const wordA = resA.word;

  const resB = getOrCreateWord(currentWords, termB);
  currentWords = resB.updatedWords;
  const wordB = resB.word;

  // Prevent duplicate connections between the same two words under the same tag
  const isDuplicate = hasRelation(currentWords, wordA.id, wordB.id, tag);
  if (isDuplicate) {
    return {
      updatedWords: currentWords,
      wordA,
      wordB,
      duplicate: true,
    };
  }

  const linkedWords = linkWords(currentWords, wordA.id, wordB.id, tag);
  return {
    updatedWords: linkedWords,
    wordA,
    wordB,
    duplicate: false,
  };
}

/**
 * Removes a mutual relation between Word A and Word B.
 */
export function unlinkWords(
  words: Word[],
  wordIdA: string,
  wordIdB: string,
  tag?: RelationTag
): Word[] {
  return words.map((w) => {
    if (w.id === wordIdA) {
      return {
        ...w,
        relations: w.relations.filter((r) => {
          if (r.targetWordId !== wordIdB) return true;
          if (tag) return r.tag !== tag;
          return false;
        }),
        updatedAt: Date.now(),
      };
    }

    if (w.id === wordIdB) {
      return {
        ...w,
        relations: w.relations.filter((r) => {
          if (r.targetWordId !== wordIdA) return true;
          if (tag) return r.tag !== tag;
          return false;
        }),
        updatedAt: Date.now(),
      };
    }

    return w;
  });
}

/**
 * Edits the tag of a mutual relation between Word A and Word B.
 * Both words are updated synchronously.
 */
export function updateRelationTag(
  words: Word[],
  wordIdA: string,
  wordIdB: string,
  oldTag: RelationTag,
  newTag: RelationTag
): Word[] {
  if (oldTag === newTag) return words;

  // Check if newTag already exists between them
  const duplicate = hasRelation(words, wordIdA, wordIdB, newTag);
  if (duplicate) {
    // If new tag already exists, just remove the old tag relation from both
    return unlinkWords(words, wordIdA, wordIdB, oldTag);
  }

  return words.map((w) => {
    if (w.id === wordIdA) {
      return {
        ...w,
        relations: w.relations.map((r) =>
          r.targetWordId === wordIdB && r.tag === oldTag ? { ...r, tag: newTag } : r
        ),
        updatedAt: Date.now(),
      };
    }

    if (w.id === wordIdB) {
      return {
        ...w,
        relations: w.relations.map((r) =>
          r.targetWordId === wordIdA && r.tag === oldTag ? { ...r, tag: newTag } : r
        ),
        updatedAt: Date.now(),
      };
    }

    return w;
  });
}

/**
 * Deletes a word and removes all mutual relation references to it in all other words.
 */
export function deleteWord(words: Word[], wordId: string): Word[] {
  return words
    .filter((w) => w.id !== wordId)
    .map((w) => ({
      ...w,
      relations: w.relations.filter((r) => r.targetWordId !== wordId),
      updatedAt: Date.now(),
    }));
}

/**
 * Updates a word's term string.
 */
export function updateWordTerm(words: Word[], wordId: string, newTerm: string): Word[] {
  const trimmed = newTerm.trim();
  if (!trimmed) return words;

  return words.map((w) => {
    if (w.id === wordId) {
      return {
        ...w,
        term: trimmed,
        updatedAt: Date.now(),
      };
    }
    return w;
  });
}

/**
 * Extracts all unique mutual spy pairs from the word graph.
 * Highly optimized for 5,000+ words / pairs.
 */
export function extractAllPairs(words: Word[]): PairItem[] {
  const wordsMap = new Map<string, Word>();
  for (let i = 0; i < words.length; i++) {
    wordsMap.set(words[i].id, words[i]);
  }

  const uniqueEdges = new Set<string>();
  const pairs: PairItem[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wId = word.id;
    const rels = word.relations;
    for (let j = 0; j < rels.length; j++) {
      const rel = rels[j];
      const tId = rel.targetWordId;
      const pairKey = (wId < tId ? `${wId}::${tId}` : `${tId}::${wId}`) + '::' + rel.tag;

      if (!uniqueEdges.has(pairKey)) {
        uniqueEdges.add(pairKey);
        const target = wordsMap.get(tId);
        if (target) {
          // Standardize display order: alphabetical
          const isWordFirst = fastCollator.compare(word.term, target.term) <= 0;
          const [wA, wB] = isWordFirst ? [word, target] : [target, word];

          pairs.push({
            id: pairKey,
            wordA: wA,
            wordB: wB,
            tag: rel.tag,
          });
        }
      }
    }
  }

  // Fast alphabetized sort using reusable collator
  return pairs.sort((a, b) => {
    const compA = fastCollator.compare(a.wordA.term, b.wordA.term);
    if (compA !== 0) return compA;
    return fastCollator.compare(a.wordB.term, b.wordB.term);
  });
}


