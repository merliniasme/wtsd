/**
 * Homoglyph and Anti-Censorship text transformation utilities.
 * Uses visually identical / near-identical Cyrillic (Russian) Unicode characters
 * to escape and bypass automated keyword filters, chat censorship, and blacklists.
 */

// Cyrillic Small & Capital lookalike mappings for Latin characters
export const CYRILLIC_HOMOGLYPH_MAP: Record<string, string> = {
  // Lowercase
  a: '\u0430', // Cyrillic Small Letter A (U+0430)
  c: '\u0441', // Cyrillic Small Letter Es (U+0441)
  d: '\u0501', // Cyrillic Small Letter Komi De (U+0501)
  e: '\u0435', // Cyrillic Small Letter Ie (U+0435)
  h: '\u04BB', // Cyrillic Small Letter Shha (U+04BB)
  i: '\u0456', // Cyrillic Small Letter Byelorussian-Ukrainian I (U+0456)
  j: '\u0458', // Cyrillic Small Letter Je (U+0458)
  o: '\u043E', // Cyrillic Small Letter O (U+043E)
  p: '\u0440', // Cyrillic Small Letter Er (U+0440)
  q: '\u051B', // Cyrillic Small Letter Qa (U+051B)
  s: '\u0455', // Cyrillic Small Letter Dze (U+0455)
  x: '\u0445', // Cyrillic Small Letter Ha (U+0445)
  y: '\u0443', // Cyrillic Small Letter U (U+0443)

  // Uppercase
  A: '\u0410', // Cyrillic Capital Letter A (U+0410)
  B: '\u0412', // Cyrillic Capital Letter Ve (U+0412)
  C: '\u0421', // Cyrillic Capital Letter Es (U+0421)
  E: '\u0415', // Cyrillic Capital Letter Ie (U+0415)
  H: '\u041D', // Cyrillic Capital Letter En (U+041D)
  I: '\u0406', // Cyrillic Capital Letter Byelorussian-Ukrainian I (U+0406)
  J: '\u0408', // Cyrillic Capital Letter Je (U+0408)
  K: '\u041A', // Cyrillic Capital Letter Ka (U+041A)
  M: '\u041C', // Cyrillic Capital Letter Em (U+041C)
  O: '\u041E', // Cyrillic Capital Letter O (U+041E)
  P: '\u0420', // Cyrillic Capital Letter Er (U+0420)
  S: '\u0405', // Cyrillic Capital Letter Dze (U+0405)
  T: '\u0422', // Cyrillic Capital Letter Te (U+0422)
  X: '\u0425', // Cyrillic Capital Letter Ha (U+0425)
  Y: '\u04AE', // Cyrillic Capital Letter Straight U (U+04AE)
};

// Vowels only for subtle stealth mode
export const CYRILLIC_VOWELS_MAP: Record<string, string> = {
  a: '\u0430',
  e: '\u0435',
  i: '\u0456',
  o: '\u043E',
  A: '\u0410',
  E: '\u0415',
  I: '\u0406',
  O: '\u041E',
};

// Zero-Width Non-Joiner (U+200C)
export const ZWNJ = '\u200C';

export type EscapeMode = 'cyrillic' | 'vowels' | 'invisible' | 'maximum';

export interface EscapeModeInfo {
  id: EscapeMode;
  name: string;
  shortDesc: string;
  badge: string;
}

export const ESCAPE_MODES: EscapeModeInfo[] = [
  {
    id: 'cyrillic',
    name: 'Sirilik Rusia (Homoglif)',
    shortDesc: 'Mengganti huruf Latin dengan huruf Sirilik Rusia yang identik secara visual',
    badge: 'Rekomendasi',
  },
  {
    id: 'vowels',
    name: 'Vokal Sirilik Saja (Stealth)',
    shortDesc: 'Hanya mengganti huruf vokal (a, e, i, o) untuk tampilan paling mulus',
    badge: 'Halus',
  },
  {
    id: 'invisible',
    name: 'Pemisah Tak Terlihat (ZWNJ)',
    shortDesc: 'Menyisipkan karakter tak kasat mata di antara huruf untuk mematahkan filter',
    badge: 'Invisible',
  },
  {
    id: 'maximum',
    name: 'Maksimal (Sirilik + ZWNJ)',
    shortDesc: 'Kombinasi huruf Sirilik dan pemisah tak terlihat untuk filter sangat ketat',
    badge: 'Ultra',
  },
];

/**
 * Transforms input text to escape censorship based on selected mode.
 */
export function insertZWSInMiddle(text: string): string {
  if (!text || text.length < 2) return text;
  const mid = Math.floor(text.length / 2);
  return text.substring(0, mid) + '\u200B' + text.substring(mid);
}

export function escapeCensoredWord(text: string): string {
  return insertZWSInMiddle(text);
}

/**
 * Inspects character by character transformation for detailed UI breakdowns.
 */
export interface TransformedCharDetail {
  original: string;
  transformed: string;
  isReplaced: boolean;
  unicodeHex: string;
  description: string;
}

export function inspectTransformation(
  text: string,
  mode: EscapeMode = 'cyrillic'
): TransformedCharDetail[] {
  const transformed = escapeCensoredWord(text, mode);
  const details: TransformedCharDetail[] = [];

  // For invisible/maximum mode, handle length differences gracefully
  if (mode === 'invisible' || mode === 'maximum') {
    const chars = Array.from(transformed);
    for (const ch of chars) {
      const code = ch.charCodeAt(0);
      const isZwnj = ch === ZWNJ;
      details.push({
        original: isZwnj ? '' : ch,
        transformed: ch,
        isReplaced: isZwnj || CYRILLIC_HOMOGLYPH_MAP[ch] !== undefined,
        unicodeHex: `U+${code.toString(16).padStart(4, '0').toUpperCase()}`,
        description: isZwnj
          ? 'Zero-Width Non-Joiner'
          : code > 127
          ? 'Cyrillic Character'
          : 'Standard Latin',
      });
    }
    return details;
  }

  // 1:1 character length modes
  for (let i = 0; i < text.length; i++) {
    const orig = text[i];
    const trans = transformed[i] || orig;
    const isReplaced = orig !== trans;
    const code = trans.charCodeAt(0);

    details.push({
      original: orig,
      transformed: trans,
      isReplaced,
      unicodeHex: `U+${code.toString(16).padStart(4, '0').toUpperCase()}`,
      description: isReplaced ? 'Sirilik (Rusia)' : 'Latin Asli',
    });
  }

  return details;
}

/**
 * Robust copy helper with cross-browser and iframe fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Modern navigator.clipboard API
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back to document.execCommand
  }

  // 2. Fallback: temporary hidden textarea
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-999999px';
    textarea.style.top = '-999999px';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (err) {
    console.error('Failed to copy to clipboard', err);
    return false;
  }
}
