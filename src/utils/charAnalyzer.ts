/**
 * Character Analyzer Utility.
 * Detects, categorizes, and inspects non-standard Latin characters,
 * homoglyphs (Cyrillic, Greek), invisible/zero-width characters,
 * accented characters, symbols, digits, and foreign scripts.
 */

// Reverse mapping for Cyrillic lookalikes to Standard Latin
export const CYRILLIC_TO_LATIN_MAP: Record<string, string> = {
  // Lowercase Cyrillic -> Latin
  '\u0430': 'a', // Cyrillic Small A
  '\u0441': 'c', // Cyrillic Small Es
  '\u0501': 'd', // Cyrillic Small Komi De
  '\u0435': 'e', // Cyrillic Small Ie
  '\u04BB': 'h', // Cyrillic Small Shha
  '\u0456': 'i', // Cyrillic Small Byelorussian-Ukrainian I
  '\u0458': 'j', // Cyrillic Small Je
  '\u043E': 'o', // Cyrillic Small O
  '\u0440': 'p', // Cyrillic Small Er
  '\u051B': 'q', // Cyrillic Small Qa
  '\u0455': 's', // Cyrillic Small Dze
  '\u0445': 'x', // Cyrillic Small Ha
  '\u0443': 'y', // Cyrillic Small U

  // Uppercase Cyrillic -> Latin
  '\u0410': 'A', // Cyrillic Capital A
  '\u0412': 'B', // Cyrillic Capital Ve
  '\u0421': 'C', // Cyrillic Capital Es
  '\u0415': 'E', // Cyrillic Capital Ie
  '\u041D': 'H', // Cyrillic Capital En
  '\u0406': 'I', // Cyrillic Capital Byelorussian-Ukrainian I
  '\u0408': 'J', // Cyrillic Capital Je
  '\u041A': 'K', // Cyrillic Capital Ka
  '\u041C': 'M', // Cyrillic Capital Em
  '\u041E': 'O', // Cyrillic Capital O
  '\u0420': 'P', // Cyrillic Capital Er
  '\u0405': 'S', // Cyrillic Capital Dze
  '\u0422': 'T', // Cyrillic Capital Te
  '\u0425': 'X', // Cyrillic Capital Ha
  '\u04AE': 'Y', // Cyrillic Capital Straight U
};

// Greek lookalikes to Standard Latin
export const GREEK_TO_LATIN_MAP: Record<string, string> = {
  '\u03B1': 'a', // Greek Small Alpha
  '\u03B2': 'b', // Greek Small Beta
  '\u03BF': 'o', // Greek Small Omicron
  '\u03BD': 'v', // Greek Small Nu
  '\u03C1': 'p', // Greek Small Rho
  '\u03C4': 't', // Greek Small Tau
  '\u03BA': 'k', // Greek Small Kappa
  '\u03C7': 'x', // Greek Small Chi
  '\u03C9': 'w', // Greek Small Omega
  '\u0391': 'A', // Greek Capital Alpha
  '\u0392': 'B', // Greek Capital Beta
  '\u0395': 'E', // Greek Capital Epsilon
  '\u0396': 'Z', // Greek Capital Zeta
  '\u0397': 'H', // Greek Capital Eta
  '\u0399': 'I', // Greek Capital Iota
  '\u039A': 'K', // Greek Capital Kappa
  '\u039C': 'M', // Greek Capital Mu
  '\u039D': 'N', // Greek Capital Nu
  '\u039F': 'O', // Greek Capital Omicron
  '\u03A1': 'P', // Greek Capital Rho
  '\u03A4': 'T', // Greek Capital Tau
  '\u03A7': 'X', // Greek Capital Chi
  '\u03A5': 'Y', // Greek Capital Upsilon
};

// Invisible / Zero-width characters
export const INVISIBLE_CHARS_MAP: Record<string, string> = {
  '\u200B': 'Zero-Width Space (ZWSP)',
  '\u200C': 'Zero-Width Non-Joiner (ZWNJ)',
  '\u200D': 'Zero-Width Joiner (ZWJ)',
  '\u00AD': 'Soft Hyphen',
  '\u2060': 'Word Joiner',
  '\uFEFF': 'Zero-Width No-Break Space (BOM)',
  '\u200E': 'Left-to-Right Mark',
  '\u200F': 'Right-to-Left Mark',
  '\u202A': 'Left-to-Right Embedding',
  '\u202B': 'Right-to-Left Embedding',
  '\u202C': 'Pop Directional Formatting',
  '\u202D': 'Left-to-Right Override',
  '\u202E': 'Right-to-Left Override',
};

export type CharCategory =
  | 'standard-latin'
  | 'cyrillic-homoglyph'
  | 'greek-homoglyph'
  | 'invisible'
  | 'accented-latin'
  | 'whitespace'
  | 'digit'
  | 'common-symbol'
  | 'other-cyrillic'
  | 'other-greek'
  | 'emoji'
  | 'other-non-latin';

export interface AnalyzedChar {
  char: string;
  displayChar: string;
  codePoint: number;
  hex: string;
  isStandardLatin: boolean;
  isWhitespace: boolean;
  category: CharCategory;
  categoryLabel: string;
  badgeColor: string;
  mimicsLatin: string | null;
  description: string;
}

export interface TextAnalysisResult {
  rawText: string;
  cleanedText: string;
  totalChars: number;
  standardLatinCount: number;
  nonLatinCount: number;
  homoglyphCount: number;
  invisibleCount: number;
  accentedCount: number;
  digitCount: number;
  symbolCount: number;
  whitespaceCount: number;
  hasNonLatin: boolean;
  hasSuspiciousDisguise: boolean;
  verdict: 'clean-latin' | 'suspicious-disguise' | 'mixed-non-latin' | 'non-latin';
  verdictTitle: string;
  verdictDescription: string;
  analyzedChars: AnalyzedChar[];
  detectedTypes: string[];
}

/**
 * Checks if a single character is a standard ASCII Latin letter [a-zA-Z].
 */
export function isStandardLatin(char: string): boolean {
  return /^[a-zA-Z]$/.test(char);
}

/**
 * Checks if a word contains ANY character that is not standard Latin alphabet [a-zA-Z]
 * (excluding basic space).
 */
export function containsNonLatinChars(text: string): boolean {
  if (!text) return false;
  // Non-Latin alphabet check: anything other than A-Z, a-z and spaces
  return /[^a-zA-Z\s]/.test(text);
}

/**
 * Checks if a word contains suspicious camouflage (Cyrillic/Greek homoglyphs or invisible chars).
 */
export function containsSuspiciousCamouflage(text: string): boolean {
  if (!text) return false;
  for (const ch of Array.from(text)) {
    if (CYRILLIC_TO_LATIN_MAP[ch] || GREEK_TO_LATIN_MAP[ch] || INVISIBLE_CHARS_MAP[ch]) {
      return true;
    }
  }
  return false;
}

/**
 * Analyzes a single character and produces full classification and metadata.
 */
export function analyzeCharacter(char: string): AnalyzedChar {
  const codePoint = char.codePointAt(0) || 0;
  const hex = `U+${codePoint.toString(16).padStart(4, '0').toUpperCase()}`;

  // 1. Standard Latin [a-zA-Z]
  if (isStandardLatin(char)) {
    return {
      char,
      displayChar: char,
      codePoint,
      hex,
      isStandardLatin: true,
      isWhitespace: false,
      category: 'standard-latin',
      categoryLabel: 'Latin Standar',
      badgeColor: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
      mimicsLatin: null,
      description: `Huruf Latin ASCII '${char}'`,
    };
  }

  // 2. Whitespace
  if (/^\s$/.test(char)) {
    return {
      char,
      displayChar: '␣',
      codePoint,
      hex,
      isStandardLatin: false,
      isWhitespace: true,
      category: 'whitespace',
      categoryLabel: 'Spasi',
      badgeColor: 'bg-slate-800/80 border-slate-700 text-slate-400',
      mimicsLatin: null,
      description: 'Spasi standar (Whitespace)',
    };
  }

  // 3. Invisible / Zero-width characters
  if (INVISIBLE_CHARS_MAP[char]) {
    return {
      char,
      displayChar: '◌ (ZW)',
      codePoint,
      hex,
      isStandardLatin: false,
      isWhitespace: false,
      category: 'invisible',
      categoryLabel: 'Karakter Tak Terlihat',
      badgeColor: 'bg-purple-500/20 border-purple-500/50 text-purple-300 font-bold',
      mimicsLatin: null,
      description: `${INVISIBLE_CHARS_MAP[char]} (biasanya disisipkan untuk mematahkan filter)`,
    };
  }

  // 4. Cyrillic Homoglyph (Russian lookalike)
  if (CYRILLIC_TO_LATIN_MAP[char]) {
    const targetLatin = CYRILLIC_TO_LATIN_MAP[char];
    return {
      char,
      displayChar: char,
      codePoint,
      hex,
      isStandardLatin: false,
      isWhitespace: false,
      category: 'cyrillic-homoglyph',
      categoryLabel: 'Sirilik Rusia (Homoglif)',
      badgeColor: 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-bold',
      mimicsLatin: targetLatin,
      description: `Huruf Sirilik Rusia (identik visual dengan Latin '${targetLatin}')`,
    };
  }

  // 5. Greek Homoglyph
  if (GREEK_TO_LATIN_MAP[char]) {
    const targetLatin = GREEK_TO_LATIN_MAP[char];
    return {
      char,
      displayChar: char,
      codePoint,
      hex,
      isStandardLatin: false,
      isWhitespace: false,
      category: 'greek-homoglyph',
      categoryLabel: 'Yunani (Homoglif)',
      badgeColor: 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold',
      mimicsLatin: targetLatin,
      description: `Huruf Yunani (mirip dengan Latin '${targetLatin}')`,
    };
  }

  // 6. Accented / Diacritical Latin (e.g. é, à, ñ, ü, č)
  const normalizedChar = char.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalizedChar !== char && /^[a-zA-Z]$/.test(normalizedChar)) {
    return {
      char,
      displayChar: char,
      codePoint,
      hex,
      isStandardLatin: false,
      isWhitespace: false,
      category: 'accented-latin',
      categoryLabel: 'Latin Beraksen (Diakritik)',
      badgeColor: 'bg-sky-500/20 border-sky-500/40 text-sky-300',
      mimicsLatin: normalizedChar,
      description: `Latin Beraksen (dasar huruf '${normalizedChar}')`,
    };
  }

  // 7. Digits 0-9
  if (/^[0-9]$/.test(char)) {
    return {
      char,
      displayChar: char,
      codePoint,
      hex,
      isStandardLatin: false,
      isWhitespace: false,
      category: 'digit',
      categoryLabel: 'Angka (Digit)',
      badgeColor: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
      mimicsLatin: null,
      description: `Angka ASCII '${char}'`,
    };
  }

  // 8. Common Latin punctuation / symbols
  if (/^[.,\/#!$%\^&\*;:{}=\-_`~()?"'@+<>\[\]\\|]$/.test(char)) {
    return {
      char,
      displayChar: char,
      codePoint,
      hex,
      isStandardLatin: false,
      isWhitespace: false,
      category: 'common-symbol',
      categoryLabel: 'Tanda Baca / Simbol',
      badgeColor: 'bg-slate-700/50 border-slate-600 text-slate-300',
      mimicsLatin: null,
      description: `Tanda baca / simbol '${char}'`,
    };
  }

  // 9. Other Cyrillic (non-homoglyph)
  if (codePoint >= 0x0400 && codePoint <= 0x052F) {
    return {
      char,
      displayChar: char,
      codePoint,
      hex,
      isStandardLatin: false,
      isWhitespace: false,
      category: 'other-cyrillic',
      categoryLabel: 'Karakter Sirilik',
      badgeColor: 'bg-red-500/15 border-red-500/30 text-red-300',
      mimicsLatin: null,
      description: `Karakter Sirilik asli (${hex})`,
    };
  }

  // 10. Other Greek (non-homoglyph)
  if (codePoint >= 0x0370 && codePoint <= 0x03FF) {
    return {
      char,
      displayChar: char,
      codePoint,
      hex,
      isStandardLatin: false,
      isWhitespace: false,
      category: 'other-greek',
      categoryLabel: 'Karakter Yunani',
      badgeColor: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
      mimicsLatin: null,
      description: `Karakter Yunani (${hex})`,
    };
  }

  // 11. Emoji (Supplementary Multilingual Plane or common dingbats)
  if (
    (codePoint >= 0x1F300 && codePoint <= 0x1FAFF) ||
    (codePoint >= 0x2600 && codePoint <= 0x27BF)
  ) {
    return {
      char,
      displayChar: char,
      codePoint,
      hex,
      isStandardLatin: false,
      isWhitespace: false,
      category: 'emoji',
      categoryLabel: 'Emoji / Simbol Grafis',
      badgeColor: 'bg-pink-500/20 border-pink-500/40 text-pink-300',
      mimicsLatin: null,
      description: `Emoji atau simbol grafis (${hex})`,
    };
  }

  // 12. Fallback: other non-Latin characters
  return {
    char,
    displayChar: char,
    codePoint,
    hex,
    isStandardLatin: false,
    isWhitespace: false,
    category: 'other-non-latin',
    categoryLabel: 'Non-Latin Lainnya',
    badgeColor: 'bg-orange-500/20 border-orange-500/40 text-orange-300',
    mimicsLatin: null,
    description: `Karakter Non-Latin (${hex})`,
  };
}

/**
 * Fully analyzes a string for any non-Latin or disguised characters,
 * providing counts, classifications, and a normalized standard Latin version.
 */
export function analyzeText(text: string): TextAnalysisResult {
  const chars = Array.from(text);
  const totalChars = chars.length;

  const analyzedChars: AnalyzedChar[] = [];
  const cleanedChars: string[] = [];

  let standardLatinCount = 0;
  let nonLatinCount = 0;
  let homoglyphCount = 0;
  let invisibleCount = 0;
  let accentedCount = 0;
  let digitCount = 0;
  let symbolCount = 0;
  let whitespaceCount = 0;

  const typesSet = new Set<string>();

  for (const ch of chars) {
    const analyzed = analyzeCharacter(ch);
    analyzedChars.push(analyzed);

    if (analyzed.isStandardLatin) {
      standardLatinCount++;
      cleanedChars.push(ch);
    } else if (analyzed.isWhitespace) {
      whitespaceCount++;
      cleanedChars.push(ch);
    } else {
      nonLatinCount++;
      typesSet.add(analyzed.categoryLabel);

      // Cleaned normalization:
      if (analyzed.category === 'invisible') {
        invisibleCount++;
        // Drop invisible chars
      } else if (analyzed.category === 'cyrillic-homoglyph' && analyzed.mimicsLatin) {
        homoglyphCount++;
        cleanedChars.push(analyzed.mimicsLatin);
      } else if (analyzed.category === 'greek-homoglyph' && analyzed.mimicsLatin) {
        homoglyphCount++;
        cleanedChars.push(analyzed.mimicsLatin);
      } else if (analyzed.category === 'accented-latin' && analyzed.mimicsLatin) {
        accentedCount++;
        cleanedChars.push(analyzed.mimicsLatin);
      } else if (analyzed.category === 'digit') {
        digitCount++;
        cleanedChars.push(ch);
      } else if (analyzed.category === 'common-symbol') {
        symbolCount++;
        cleanedChars.push(ch);
      } else {
        cleanedChars.push(ch);
      }
    }
  }

  const cleanedText = cleanedChars.join('');
  const hasSuspiciousDisguise = homoglyphCount > 0 || invisibleCount > 0;
  const hasNonLatin = nonLatinCount > 0;

  // Compute Verdict
  let verdict: TextAnalysisResult['verdict'] = 'clean-latin';
  let verdictTitle = 'Murni Huruf Latin';
  let verdictDescription =
    'Seluruh karakter merupakan huruf Latin standar (A-Z, a-z) tanpa kamuflase.';

  if (hasSuspiciousDisguise) {
    verdict = 'suspicious-disguise';
    verdictTitle = 'Terdeteksi Kamuflase / Homoglif!';
    verdictDescription = `Teks mengandung ${homoglyphCount} huruf homoglif (Sirilik/Yunani) dan ${invisibleCount} karakter tak terlihat yang disengaja untuk lolos filter sensor.`;
  } else if (nonLatinCount > 0 && standardLatinCount > 0) {
    verdict = 'mixed-non-latin';
    verdictTitle = 'Campuran Huruf Latin & Non-Latin';
    verdictDescription = `Teks mengandung campuran huruf Latin dengan ${nonLatinCount} karakter non-Latin (tanda baca, angka, simbol, atau aksara lain).`;
  } else if (nonLatinCount > 0 && standardLatinCount === 0 && totalChars > 0) {
    verdict = 'non-latin';
    verdictTitle = 'Karakter Non-Latin Penuh';
    verdictDescription = 'Teks tidak mengandung huruf alfabet Latin standar sama sekali.';
  }

  return {
    rawText: text,
    cleanedText,
    totalChars,
    standardLatinCount,
    nonLatinCount,
    homoglyphCount,
    invisibleCount,
    accentedCount,
    digitCount,
    symbolCount,
    whitespaceCount,
    hasNonLatin,
    hasSuspiciousDisguise,
    verdict,
    verdictTitle,
    verdictDescription,
    analyzedChars,
    detectedTypes: Array.from(typesSet),
  };
}
