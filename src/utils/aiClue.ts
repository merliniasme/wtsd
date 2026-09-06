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

export interface ClueRequestOptions {
  apiKey?: string;
  model?: GeminiModelId;
  temperature?: number;
  maxRetries?: number;
}

/**
 * Direct client-to-Google Gemini REST API invocation.
 * Bypasses intermediate server when:
 * 1) Running on a static host (e.g. Vercel, Netlify) where /api routes return 404
 * 2) Testing or using a user-provided custom Gemini API Key
 */
export async function callDirectGeminiApi(
  apiKey: string,
  preferredModel: GeminiModelId,
  prompt: string,
  temperature: number = 0.75
): Promise<{ text: string; modelUsed: string; latencyMs: number }> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    throw new Error('Gemini API key is required.');
  }

  const modelsToTry: string[] = [
    preferredModel,
    ...GEMINI_SUPPORTED_MODELS.map((m) => m.id).filter((m) => m !== preferredModel),
  ];

  let lastErrorMessage = '';
  const startTime = Date.now();

  for (const model of modelsToTry) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:generateContent?key=${encodeURIComponent(trimmedKey)}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: Math.max(0.1, Math.min(1.0, temperature)),
          },
        }),
      });

      const raw = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(raw);
      } catch {
        lastErrorMessage = `Gemini API returned unreadable response (${res.status})`;
        continue;
      }

      if (!res.ok) {
        const errMsg = data?.error?.message || `Google API error (${res.status})`;
        lastErrorMessage = errMsg;

        // If clearly invalid API key, fail immediately without exhausting models
        if (
          errMsg.toLowerCase().includes('api_key_invalid') ||
          errMsg.toLowerCase().includes('api key not valid')
        ) {
          throw new Error(`Invalid Gemini API Key: ${errMsg}`);
        }
        // If quota 429 or unavailable 503, try next candidate model
        continue;
      }

      const text =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        data?.candidates?.[0]?.output ||
        '';

      if (text && text.trim()) {
        const latencyMs = Date.now() - startTime;
        return { text: text.trim(), modelUsed: model, latencyMs };
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('Invalid Gemini API Key')) {
        throw err;
      }
      lastErrorMessage = err instanceof Error ? err.message : String(err);
    }
  }

  throw new Error(lastErrorMessage || 'Failed to connect to Gemini API.');
}

/**
 * Tests direct Gemini API connectivity in the browser.
 */
export async function testDirectGeminiApi(
  apiKey: string,
  model: GeminiModelId
): Promise<AiHealthResponse> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    return {
      status: 'error',
      isCustomKey: false,
      message: 'No API key provided for direct Gemini test.',
    };
  }

  try {
    const res = await callDirectGeminiApi(
      trimmedKey,
      model,
      'Connection test. Reply with: PONG',
      0.2
    );
    return {
      status: 'ok',
      activeModel: res.modelUsed,
      response: res.text,
      latencyMs: res.latencyMs,
      isCustomKey: true,
      message: `Connected directly to Google Gemini API (${res.latencyMs}ms latency via Browser Direct)`,
    };
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : String(err);
    return {
      status: 'error',
      isCustomKey: true,
      message: raw,
    };
  }
}

/**
 * Quick diagnostic test verifying that Gemini AI is responding properly.
 * Supports both server proxy testing and direct browser testing with custom keys.
 */
export async function testAiHealthApi(
  customApiKey?: string,
  customModel?: string
): Promise<AiHealthResponse> {
  const keyToUse =
    customApiKey !== undefined ? customApiKey.trim() : getCustomGeminiApiKey();
  const modelToUse =
    (customModel as GeminiModelId) || getSelectedGeminiModel();

  try {
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
    let isJson = false;
    try {
      data = JSON.parse(rawText);
      isJson = true;
    } catch {
      isJson = false;
    }

    // Success from server
    if (res.ok && data?.status === 'ok') {
      return data as AiHealthResponse;
    }

    // If 404 (e.g. deployed to Vercel/Netlify/static CDN where server is not hosted)
    if (res.status === 404 || !isJson) {
      // If user has a custom key, seamlessly test directly via Google Gemini API
      if (keyToUse) {
        return await testDirectGeminiApi(keyToUse, modelToUse);
      }

      // Clear, actionable guidance for static deployments instead of raw HTML error
      if (res.status === 404) {
        return {
          status: 'error',
          isCustomKey: false,
          serverKeyConfigured: false,
          message:
            'Static host detected (404 on /api/ai/test). The Express server is not running on this URL. Please enter your personal Gemini API Key below in Settings to connect directly from your browser!',
        };
      }
    }

    // If server error and custom key provided, try direct fallback
    if (!res.ok) {
      if (keyToUse && (res.status === 500 || res.status === 503)) {
        try {
          return await testDirectGeminiApi(keyToUse, modelToUse);
        } catch {
          // fall through
        }
      }

      return {
        status: 'error',
        message:
          data?.message || `Server returned error (${res.status}): ${rawText.slice(0, 100)}`,
      };
    }

    return data as AiHealthResponse;
  } catch (err: unknown) {
    if (keyToUse) {
      return await testDirectGeminiApi(keyToUse, modelToUse);
    }
    const msg = err instanceof Error ? err.message : String(err);
    return {
      status: 'error',
      message: msg,
    };
  }
}

/**
 * Calls the Gemini API to generate clues for a given prompt and word.
 * Automatically checks server proxy, handles static hosting 404s, and falls back to direct Gemini API.
 */
export async function generateAiClueApi(
  prompt: string,
  word: string,
  options: ClueRequestOptions = {}
): Promise<GenerateClueResponse> {
  const maxRetries = options.maxRetries ?? 1;
  const apiKey = options.apiKey !== undefined ? options.apiKey.trim() : getCustomGeminiApiKey();
  const model = options.model !== undefined ? options.model : getSelectedGeminiModel();
  const temperature =
    options.temperature !== undefined ? options.temperature : getGeminiTemperature();

  let attempt = 0;
  let lastErrorMsg = 'Failed to communicate with AI server.';
  let isBackend404 = false;

  while (attempt <= maxRetries && !isBackend404) {
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
        if (response.status === 404) {
          isBackend404 = true;
          break;
        }
        if (rawText.includes('The page') || rawText.includes('<html') || rawText.includes('<!DOCTYPE')) {
          lastErrorMsg = `The server returned an HTML page (${response.status} ${response.statusText}).`;
        } else {
          lastErrorMsg = `Unexpected response from server (${response.status}): ${rawText.slice(0, 120)}`;
        }

        if (attempt <= maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        break;
      }

      if (response.status === 404) {
        isBackend404 = true;
        break;
      }

      if (!response.ok || !data?.success) {
        const errorMsg = data?.error || `Server responded with status ${response.status}`;
        if (response.status === 503 && attempt <= maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
          continue;
        }
        lastErrorMsg = errorMsg;
        if (apiKey) {
          break;
        }
        throw new Error(errorMsg);
      }

      return data as GenerateClueResponse;
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        (err.message.includes('GEMINI_API_KEY') || err.message.includes('api_key_invalid'))
      ) {
        throw err;
      }
      lastErrorMsg = err instanceof Error ? err.message : String(err);
      if (attempt <= maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
    }
  }

  // If backend was 404 or failed, but a custom key is available, execute direct in-browser call
  if (apiKey) {
    try {
      const direct = await callDirectGeminiApi(apiKey, model, prompt, temperature);
      return {
        success: true,
        text: direct.text,
        modelUsed: direct.modelUsed,
        promptSent: prompt,
        word,
        isCustomKey: true,
      };
    } catch (directErr: unknown) {
      const msg = directErr instanceof Error ? directErr.message : String(directErr);
      throw new Error(msg);
    }
  }

  // If backend was 404 and no key is configured
  if (isBackend404) {
    throw new Error(
      'AI server endpoint not found (404). This app is currently hosted on a static domain (such as Vercel) where the backend server is not running. Please open Settings > Gemini AI Configuration and enter your personal Gemini API Key to enable AI clues directly.'
    );
  }

  throw new Error(lastErrorMsg);
}

