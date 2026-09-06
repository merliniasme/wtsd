import {
  GeminiModelId,
  GeminiClueStyle,
  GeminiModelOption,
} from '../types';

/**
 * AI Clue Generation Utilities & Prompt Management for "Who's the Spy?"
 */

export const AI_CLUE_PROMPT_STORAGE_KEY = 'whos_the_spy_custom_clue_prompt_v1';
export const GEMINI_API_KEY_STORAGE_KEY = 'whos_the_spy_gemini_api_key_v1';
export const GEMINI_MODEL_STORAGE_KEY = 'whos_the_spy_gemini_model_v1';
export const GEMINI_TEMP_STORAGE_KEY = 'whos_the_spy_gemini_temp_v1';
export const GEMINI_STYLE_STORAGE_KEY = 'whos_the_spy_gemini_style_v1';
export const GEMINI_COUNT_STORAGE_KEY = 'whos_the_spy_gemini_count_v1';

export const GEMINI_SUPPORTED_MODELS: GeminiModelOption[] = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    badge: 'Recommended',
    description: 'Optimal balance of reasoning, nuance & speed for word clues.',
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash (Latest)',
    badge: 'General',
    description: 'Auto-updating latest Flash release for fast text generation.',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    badge: 'Fastest',
    description: 'Lightweight and ultra-low latency with high availability.',
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro Preview',
    badge: 'Deep Reasoning',
    description: 'Advanced strategic reasoning for subtle deception and wordplay.',
  },
];

export const GEMINI_STYLE_PRESETS: { id: GeminiClueStyle; label: string; description: string }[] = [
  {
    id: 'balanced',
    label: 'Balanced & Subtle',
    description: 'Standard Undercover style. Veiled enough to confuse the Spy, recognizable to teammates.',
  },
  {
    id: 'bluffing',
    label: 'Spy Bluffing Mode',
    description: 'Deliberately wide, ambiguous, and evasive clues to survive if you suspect you are the Spy.',
  },
  {
    id: 'poetic',
    label: 'Poetic / Riddle',
    description: 'Metaphorical, sensory, and riddle-like descriptions that require lateral thinking.',
  },
  {
    id: 'conversational',
    label: 'Casual Spoken Banter',
    description: 'Brief, colloquial 1-liners that sound totally natural when spoken aloud at a table.',
  },
];

export const DEFAULT_CLUE_PROMPT_TEMPLATE = `You are an expert game strategist for "Who's the Spy?" (Siapa Spionnya / Undercover).

Secret Word: "{word}"
Associated Words in Dictionary: {related}
Desired Clue Strategy: {style}

Generate {count} clever, strategic spoken clues for a player holding the word "{word}".

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
 * Storage helpers for Gemini API Key
 */
export function getCustomGeminiApiKey(): string {
  try {
    return localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveCustomGeminiApiKey(key: string): void {
  try {
    const trimmed = key.trim();
    if (trimmed) {
      localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('Failed to store custom Gemini API key:', err);
  }
}

export function clearCustomGeminiApiKey(): void {
  try {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function hasCustomGeminiApiKey(): boolean {
  return Boolean(getCustomGeminiApiKey());
}

/**
 * Storage helpers for Gemini Model Selection
 */
export function getSelectedGeminiModel(): GeminiModelId {
  try {
    const stored = localStorage.getItem(GEMINI_MODEL_STORAGE_KEY);
    if (
      stored === 'gemini-3.8-flash' ||
      stored === 'gemini-flash-latest' ||
      stored === 'gemini-3.1-flash-lite' ||
      stored === 'gemini-3.1-pro-preview'
    ) {
      return stored;
    }
  } catch {
    // ignore
  }
  return 'gemini-3.8-flash';
}

export function saveSelectedGeminiModel(model: GeminiModelId): void {
  try {
    localStorage.setItem(GEMINI_MODEL_STORAGE_KEY, model);
  } catch (err) {
    console.warn('Failed to save selected Gemini model:', err);
  }
}

/**
 * Storage helpers for Gemini Temperature
 */
export function getGeminiTemperature(): number {
  try {
    const val = localStorage.getItem(GEMINI_TEMP_STORAGE_KEY);
    if (val !== null) {
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed >= 0.1 && parsed <= 1.0) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return 0.75;
}

export function saveGeminiTemperature(temp: number): void {
  try {
    const constrained = Math.max(0.1, Math.min(1.0, temp));
    localStorage.setItem(GEMINI_TEMP_STORAGE_KEY, constrained.toFixed(2));
  } catch (err) {
    console.warn('Failed to save Gemini temperature:', err);
  }
}

/**
 * Storage helpers for Gemini Clue Style & Count
 */
export function getGeminiClueStyle(): GeminiClueStyle {
  try {
    const val = localStorage.getItem(GEMINI_STYLE_STORAGE_KEY);
    if (val === 'balanced' || val === 'bluffing' || val === 'poetic' || val === 'conversational') {
      return val;
    }
  } catch {
    // ignore
  }
  return 'balanced';
}

export function saveGeminiClueStyle(style: GeminiClueStyle): void {
  try {
    localStorage.setItem(GEMINI_STYLE_STORAGE_KEY, style);
  } catch (err) {
    console.warn('Failed to save Gemini clue style:', err);
  }
}

export function getGeminiClueCount(): number {
  try {
    const val = localStorage.getItem(GEMINI_COUNT_STORAGE_KEY);
    if (val !== null) {
      const parsed = parseInt(val, 10);
      if ([1, 2, 3, 5].includes(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return 3;
}

export function saveGeminiClueCount(count: number): void {
  try {
    localStorage.setItem(GEMINI_COUNT_STORAGE_KEY, String(count));
  } catch (err) {
    console.warn('Failed to save Gemini clue count:', err);
  }
}

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
 * Interpolates {word}, {related}, {style}, and {count} tokens inside the prompt template.
 */
export function buildCluePrompt(
  template: string,
  word: string,
  relatedWords: string[] = [],
  clueStyle?: GeminiClueStyle,
  clueCount?: number
): string {
  const relatedString =
    relatedWords.length > 0
      ? relatedWords.join(', ')
      : 'None specified in current dictionary';

  const effectiveStyle = clueStyle || getGeminiClueStyle();
  const effectiveCount = clueCount || getGeminiClueCount();

  const styleLabel =
    GEMINI_STYLE_PRESETS.find((s) => s.id === effectiveStyle)?.label || 'Balanced & Subtle';

  return template
    .replace(/\{word\}/g, word)
    .replace(/\{related\}/g, relatedString)
    .replace(/\{style\}/g, styleLabel)
    .replace(/\{count\}/g, String(effectiveCount));
}

export interface GenerateClueResponse {
  success: boolean;
  text: string;
  promptSent: string;
  word: string;
  modelUsed?: string;
  isCustomKey?: boolean;
}

export interface AiHealthResponse {
  status: 'ok' | 'error';
  activeModel?: string;
  response?: string;
  message?: string;
  latencyMs?: number;
  isCustomKey?: boolean;
  serverKeyConfigured?: boolean;
}

export interface ServerAiConfig {
  serverKeyConfigured: boolean;
  defaultModel: string;
  supportedModels: GeminiModelOption[];
}

/**
 * Fetches the server-side AI configuration capabilities.
 */
export async function fetchServerAiConfig(): Promise<ServerAiConfig> {
  try {
    const res = await fetch('/api/ai/config');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as ServerAiConfig;
  } catch {
    return {
      serverKeyConfigured: false,
      defaultModel: 'gemini-3.8-flash',
      supportedModels: GEMINI_SUPPORTED_MODELS,
    };
  }
}

/**
 * Quick diagnostic test verifying that Gemini AI is responding properly.
 * Can test custom key and custom model.
 */
export async function testAiHealthApi(
  customApiKey?: string,
  customModel?: string
): Promise<AiHealthResponse> {
  try {
    const keyToUse =
      customApiKey !== undefined ? customApiKey : getCustomGeminiApiKey();
    const modelToUse =
      customModel !== undefined ? customModel : getSelectedGeminiModel();

    const res = await fetch('/api/ai/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(keyToUse ? { 'x-gemini-api-key': keyToUse } : {}),
      },
      body: JSON.stringify({
        apiKey: keyToUse || undefined,
        model: modelToUse || undefined,
      }),
    });

    const rawText = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(rawText);
    } catch {
      return {
        status: 'error',
        message: `Server returned non-JSON response (${res.status}): ${rawText.slice(0, 100)}`,
      };
    }
    return data as AiHealthResponse;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: 'error',
      message: msg,
    };
  }
}

export interface ClueRequestOptions {
  apiKey?: string;
  model?: GeminiModelId;
  temperature?: number;
  maxRetries?: number;
}

/**
 * Calls the backend Gemini endpoint to generate clues for a given prompt and word.
 * Automatically injects active stored API key, model, and temperature settings.
 * Safely handles non-JSON HTML gateway responses and retries transient errors.
 */
export async function generateAiClueApi(
  prompt: string,
  word: string,
  options: ClueRequestOptions = {}
): Promise<GenerateClueResponse> {
  const maxRetries = options.maxRetries ?? 1;
  const apiKey = options.apiKey !== undefined ? options.apiKey : getCustomGeminiApiKey();
  const model = options.model !== undefined ? options.model : getSelectedGeminiModel();
  const temperature =
    options.temperature !== undefined ? options.temperature : getGeminiTemperature();

  let attempt = 0;
  let lastErrorMsg = 'Failed to communicate with AI server.';

  while (attempt <= maxRetries) {
    attempt++;
    try {
      const response = await fetch('/api/ai/generate-clue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(apiKey ? { 'x-gemini-api-key': apiKey } : {}),
        },
        body: JSON.stringify({
          prompt,
          word,
          apiKey: apiKey || undefined,
          model,
          temperature,
        }),
      });

      const rawText = await response.text();
      let data: any = null;

      try {
        data = JSON.parse(rawText);
      } catch {
        if (rawText.includes('The page') || rawText.includes('<html') || rawText.includes('<!DOCTYPE')) {
          lastErrorMsg = `The server returned an HTML page (${response.status} ${response.statusText}). Container may be warming up.`;
        } else {
          lastErrorMsg = `Unexpected response from server (${response.status}): ${rawText.slice(0, 120)}`;
        }

        if (attempt <= maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        throw new Error(lastErrorMsg);
      }

      if (!response.ok || !data?.success) {
        const errorMsg = data?.error || `Server responded with status ${response.status}`;
        if (response.status === 503 && attempt <= maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
          continue;
        }
        throw new Error(errorMsg);
      }

      return data as GenerateClueResponse;
    } catch (err: unknown) {
      if (
        attempt <= maxRetries &&
        !(err instanceof Error && (err.message.includes('GEMINI_API_KEY') || err.message.includes('api_key_invalid')))
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(msg);
    }
  }

  throw new Error(lastErrorMsg);
}

