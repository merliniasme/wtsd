/**
 * AI Clue Generation Utilities & Prompt Management for "Who's the Spy?"
 */

export const AI_CLUE_PROMPT_STORAGE_KEY = 'whos_the_spy_custom_clue_prompt_v1';

export const DEFAULT_CLUE_PROMPT_TEMPLATE = `You are an expert game strategist for "Who's the Spy?" (Siapa Spionnya / Undercover).

Secret Word: "{word}"
Associated Words in Dictionary: {related}

Generate 3 clever, strategic spoken clues for a player holding the word "{word}".

Key Objectives:
1. Subtle Ambiguity: The clues must resonate with fellow innocent teammates holding the same or closely related words, but be veiled enough that the Spy cannot pinpoint the exact word.
2. Distinct from Opponents: If opponent or related words exist ({related}), ensure your clues do not give away the opponent's word or eliminate plausible doubt.
3. Natural Delivery: Clues should sound natural and brief when spoken aloud at the table.
4. Strategic Rationale: For each clue, include a 1-sentence analysis explaining why it protects the player and tests teammates.

Output Format:
- Clue 1: [Spoken Clue]
  Rationale: [Why it works]
- Clue 2: [Spoken Clue]
  Rationale: [Why it works]
- Clue 3: [Spoken Clue]
  Rationale: [Why it works]

Bonus Tip: [A 1-line tactical suggestion for this round]`;

/**
 * Retrieves the user's custom prompt template from localStorage, or the default.
 */
export function getCustomCluePrompt(): string {
  try {
    const stored = localStorage.getItem(AI_CLUE_PROMPT_STORAGE_KEY);
    if (stored && stored.trim().length > 0) {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_CLUE_PROMPT_TEMPLATE;
}

/**
 * Saves a custom prompt template to localStorage.
 */
export function saveCustomCluePrompt(template: string): void {
  try {
    if (!template || template.trim() === '') {
      localStorage.removeItem(AI_CLUE_PROMPT_STORAGE_KEY);
    } else {
      localStorage.setItem(AI_CLUE_PROMPT_STORAGE_KEY, template.trim());
    }
  } catch (err) {
    console.warn('Failed to save custom prompt to local storage:', err);
  }
}

/**
 * Resets the prompt template back to the built-in default.
 */
export function resetCustomCluePrompt(): string {
  try {
    localStorage.removeItem(AI_CLUE_PROMPT_STORAGE_KEY);
  } catch {
    // ignore
  }
  return DEFAULT_CLUE_PROMPT_TEMPLATE;
}

/**
 * Interpolates {word} and {related} tokens inside the prompt template.
 */
export function buildCluePrompt(
  template: string,
  word: string,
  relatedWords: string[] = []
): string {
  const relatedString =
    relatedWords.length > 0
      ? relatedWords.join(', ')
      : 'None specified in current dictionary';

  return template
    .replace(/\{word\}/g, word)
    .replace(/\{related\}/g, relatedString);
}

export interface GenerateClueResponse {
  success: boolean;
  text: string;
  promptSent: string;
  word: string;
}

/**
 * Calls the backend Gemini endpoint to generate clues for a given prompt and word.
 */
export async function generateAiClueApi(
  prompt: string,
  word: string
): Promise<GenerateClueResponse> {
  const response = await fetch('/api/ai/generate-clue', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, word }),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    const errorMsg = data?.error || `Server responded with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as GenerateClueResponse;
}
