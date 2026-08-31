import { Word } from '../types';
import { addOrLinkPair } from './wordGraph';
import { deduplicateWords } from './storage';

export interface RawParsedLine {
  lineNumber: number;
  rawText: string;
  sourceWord: string;
  targetWords: string[];
  isValid: boolean;
  error?: string;
}

export interface RawImportPairPreview {
  source: string;
  target: string;
  lineNumber: number;
}

export interface RawImportValidationResult {
  totalLines: number;
  validLines: RawParsedLine[];
  invalidLines: RawParsedLine[];
  uniqueWords: string[];
  pairs: RawImportPairPreview[];
  isValid: boolean;
}

/**
 * Strips surrounding brackets if present, e.g. "[Apel]" -> "Apel", and trims whitespace.
 */
export function cleanRawTerm(term: string): string {
  let cleaned = term.trim();
  if (cleaned.startsWith('[') && cleaned.endsWith(']') && cleaned.length >= 2) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

/**
 * Parses and validates raw text file contents according to:
 * [Word1] # [Word2] & [Word3]
 * or
 * Apel # Banana & Tomato
 */
export function validateRawImportText(rawText: string): RawImportValidationResult {
  const lines = rawText.split(/\r?\n/);
  const validLines: RawParsedLine[] = [];
  const invalidLines: RawParsedLine[] = [];
  const uniqueWordsSet = new Set<string>();
  const pairs: RawImportPairPreview[] = [];

  let parsedLineIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    const lineNumber = i + 1;

    // Ignore completely empty lines
    if (!trimmed) {
      continue;
    }

    // Ignore comment lines starting with // or --
    if (trimmed.startsWith('//') || trimmed.startsWith('--') || trimmed.startsWith('/*')) {
      continue;
    }

    parsedLineIndex++;

    // Format check: must contain '#'
    if (!trimmed.includes('#')) {
      invalidLines.push({
        lineNumber,
        rawText: rawLine,
        sourceWord: '',
        targetWords: [],
        isValid: false,
        error: "Missing '#' separator. Expected format: SourceWord # Target1 & Target2",
      });
      continue;
    }

    const parts = trimmed.split('#');
    if (parts.length > 2) {
      invalidLines.push({
        lineNumber,
        rawText: rawLine,
        sourceWord: '',
        targetWords: [],
        isValid: false,
        error: "Multiple '#' characters found on this line. Only one '#' is allowed.",
      });
      continue;
    }

    const sourceWord = cleanRawTerm(parts[0]);
    if (!sourceWord) {
      invalidLines.push({
        lineNumber,
        rawText: rawLine,
        sourceWord: '',
        targetWords: [],
        isValid: false,
        error: "Source word before '#' is empty.",
      });
      continue;
    }

    const targetSection = parts[1].trim();
    if (!targetSection) {
      invalidLines.push({
        lineNumber,
        rawText: rawLine,
        sourceWord,
        targetWords: [],
        isValid: false,
        error: "No target words specified after '#'.",
      });
      continue;
    }

    const targetChunks = targetSection.split('&');
    const targetWords: string[] = [];
    let hasTargetError = false;
    let targetErrorMessage = '';

    for (const chunk of targetChunks) {
      const cleanTarget = cleanRawTerm(chunk);
      if (!cleanTarget) {
        hasTargetError = true;
        targetErrorMessage = "Empty target word encountered around '&' separator.";
        break;
      }
      if (cleanTarget === sourceWord) {
        hasTargetError = true;
        targetErrorMessage = `Cannot link "${sourceWord}" to itself.`;
        break;
      }
      targetWords.push(cleanTarget);
    }

    if (hasTargetError) {
      invalidLines.push({
        lineNumber,
        rawText: rawLine,
        sourceWord,
        targetWords: [],
        isValid: false,
        error: targetErrorMessage,
      });
      continue;
    }

    if (targetWords.length === 0) {
      invalidLines.push({
        lineNumber,
        rawText: rawLine,
        sourceWord,
        targetWords: [],
        isValid: false,
        error: "No valid target words found after '#'.",
      });
      continue;
    }

    // Valid line!
    validLines.push({
      lineNumber,
      rawText: rawLine,
      sourceWord,
      targetWords,
      isValid: true,
    });

    uniqueWordsSet.add(sourceWord);
    for (const tw of targetWords) {
      uniqueWordsSet.add(tw);
      pairs.push({
        source: sourceWord,
        target: tw,
        lineNumber,
      });
    }
  }

  return {
    totalLines: parsedLineIndex,
    validLines,
    invalidLines,
    uniqueWords: Array.from(uniqueWordsSet),
    pairs,
    isValid: invalidLines.length === 0 && validLines.length > 0,
  };
}

/**
 * Applies valid parsed lines to the existing dictionary.
 * Each pair (source <-> target) is connected bidirectionally with 'unknown' tag.
 * Targets are NOT connected to each other (e.g. Apel -> Banana and Apel -> Tomato, not Banana -> Tomato).
 */
export function applyRawImport(
  existingWords: Word[],
  validLines: RawParsedLine[]
): {
  updatedWords: Word[];
  addedWordsCount: number;
  addedPairsCount: number;
} {
  let current = [...existingWords];
  const initialWordCount = current.length;

  for (const line of validLines) {
    const { sourceWord, targetWords } = line;
    for (const target of targetWords) {
      const res = addOrLinkPair(current, sourceWord, target, 'unknown');
      current = res.updatedWords;
    }
  }

  const finalDeduplicated = deduplicateWords(current);
  const addedWordsCount = Math.max(0, finalDeduplicated.length - initialWordCount);

  return {
    updatedWords: finalDeduplicated,
    addedWordsCount,
    addedPairsCount: validLines.reduce((acc, l) => acc + l.targetWords.length, 0),
  };
}
