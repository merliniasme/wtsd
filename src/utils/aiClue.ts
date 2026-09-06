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

export interface ModelAttemptInfo {
  model: string;
  status: 'success' | 'failed';
  durationMs: number;
  httpStatus?: number;
  errorCode?: string | number;
  error?: string;
}

export interface TechnicalErrorDetails {
  httpStatus?: number;
  errorCode?: string | number;
  message: string;
  rawError?: string;
  modelsAttempted?: ModelAttemptInfo[];
  timestamp?: string;
  apiKeyConfigured?: boolean;
}

export class AiClueError extends Error {
  technicalDetails?: TechnicalErrorDetails;
  httpStatus?: number;
  rawResponse?: string;

  constructor(
    message: string,
    technicalDetails?: TechnicalErrorDetails,
    httpStatus?: number,
    rawResponse?: string
  ) {
    super(message);
    this.name = 'AiClueError';
    this.technicalDetails = technicalDetails;
    this.httpStatus = httpStatus;
    this.rawResponse = rawResponse;
  }
}

/**
 * Safely extracts a clean string from any error object, JSON, or exception,
 * ensuring [object Object] is never shown to the user.
 */
export function safeFormatErrorMessage(val: unknown): string {
  if (!val) return 'An unknown error occurred.';
  if (typeof val === 'string') {
    if (val === '[object Object]' || val.includes('[object Object]')) {
      return 'Unexpected error object returned by the server.';
    }
    // Try checking if it's a JSON string
    try {
      const parsed = JSON.parse(val);
      if (parsed && typeof parsed === 'object') {
        return safeFormatErrorMessage(parsed);
      }
    } catch {
      // not JSON string
    }
    return val;
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, any>;
    if (typeof obj.message === 'string' && obj.message !== '[object Object]') {
      return obj.message;
    }
    if (typeof obj.error === 'string' && obj.error !== '[object Object]') {
      return obj.error;
    }
    if (obj.error && typeof obj.error === 'object') {
      return safeFormatErrorMessage(obj.error);
    }
    if (obj.technicalDetails && typeof obj.technicalDetails.message === 'string') {
      return obj.technicalDetails.message;
    }
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return 'Unstringifiable error object.';
    }
  }
  return String(val);
}

export interface GenerateClueResponse {
  success: boolean;
  text: string;
  promptSent: string;
  word: string;
  modelUsed?: string;
  technicalDetails?: TechnicalErrorDetails;
}

export interface AiHealthResponse {
  status: 'ok' | 'error';
  activeModel?: string;
  durationMs?: number;
  response?: string;
  message?: string;
  technicalDetails?: TechnicalErrorDetails;
}

/**
 * Quick diagnostic test verifying that Gemini AI is responding properly.
 */
export async function testAiHealthApi(): Promise<AiHealthResponse> {
  try {
    const res = await fetch('/api/ai/test');
    const rawText = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(rawText);
    } catch {
      return {
        status: 'error',
        message: `Server returned non-JSON response (${res.status}): ${rawText.slice(0, 100)}`,
        technicalDetails: {
          httpStatus: res.status,
          errorCode: 'NON_JSON_GATEWAY_RESPONSE',
          message: 'Server returned HTML or raw text instead of JSON.',
          rawError: rawText.slice(0, 500),
          timestamp: new Date().toISOString(),
        },
      };
    }

    return {
      status: data.status || (res.ok ? 'ok' : 'error'),
      activeModel: data.activeModel,
      durationMs: data.durationMs,
      response: data.response,
      message: safeFormatErrorMessage(data.message || data.error),
      technicalDetails: data.technicalDetails,
    };
  } catch (err: unknown) {
    const msg = safeFormatErrorMessage(err);
    return {
      status: 'error',
      message: msg,
      technicalDetails: {
        errorCode: 'FETCH_NETWORK_ERROR',
        message: msg,
        rawError: err instanceof Error ? err.stack : String(err),
        timestamp: new Date().toISOString(),
      },
    };
  }
}

/**
 * Calls the backend Gemini endpoint to generate clues for a given prompt and word.
 * Safely handles non-JSON HTML gateway responses and automatically retries transient errors.
 */
export async function generateAiClueApi(
  prompt: string,
  word: string,
  maxRetries = 1
): Promise<GenerateClueResponse> {
  let attempt = 0;
  let lastErrorMsg = 'Failed to communicate with AI server.';
  let lastTechnicalDetails: TechnicalErrorDetails | undefined;

  while (attempt <= maxRetries) {
    attempt++;
    try {
      const response = await fetch('/api/ai/generate-clue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ prompt, word }),
      });

      const rawText = await response.text();
      let data: any = null;

      try {
        data = JSON.parse(rawText);
      } catch {
        // Response was not JSON (e.g., HTML error from reverse proxy like "The page cannot be displayed")
        if (rawText.includes('The page') || rawText.includes('<html') || rawText.includes('<!DOCTYPE')) {
          lastErrorMsg = `The server or proxy returned an HTML page (${response.status} ${response.statusText}). The application container might be warming up or restarting.`;
        } else {
          lastErrorMsg = `Unexpected non-JSON response from server (${response.status}): ${rawText.slice(0, 120)}`;
        }

        lastTechnicalDetails = {
          httpStatus: response.status,
          errorCode: 'PROXY_HTML_RESPONSE',
          message: lastErrorMsg,
          rawError: rawText.slice(0, 500),
          timestamp: new Date().toISOString(),
        };

        // If retries left and it was likely a temporary proxy hiccup, wait briefly and retry
        if (attempt <= maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }
        throw new AiClueError(lastErrorMsg, lastTechnicalDetails, response.status, rawText);
      }

      if (!response.ok || !data?.success) {
        const errorMsg = safeFormatErrorMessage(data?.error || `Server responded with status ${response.status}`);
        lastErrorMsg = errorMsg;
        lastTechnicalDetails = data?.technicalDetails || {
          httpStatus: response.status,
          errorCode: response.status === 503 ? 'SERVICE_UNAVAILABLE' : `HTTP_${response.status}`,
          message: errorMsg,
          timestamp: new Date().toISOString(),
        };

        // If 503 high demand or temporary server hiccup, allow 1 retry
        if (response.status === 503 && attempt <= maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
          continue;
        }
        throw new AiClueError(errorMsg, lastTechnicalDetails, response.status, rawText);
      }

      return data as GenerateClueResponse;
    } catch (err: unknown) {
      if (err instanceof AiClueError) {
        if (attempt <= maxRetries && err.httpStatus === 503) {
          await new Promise((resolve) => setTimeout(resolve, 1200));
          continue;
        }
        throw err;
      }

      const msg = safeFormatErrorMessage(err);
      if (attempt <= maxRetries && !msg.includes('GEMINI_API_KEY')) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      throw new AiClueError(
        msg,
        lastTechnicalDetails || {
          errorCode: 'CLIENT_REQUEST_EXCEPTION',
          message: msg,
          timestamp: new Date().toISOString(),
        }
      );
    }
  }

  throw new AiClueError(lastErrorMsg, lastTechnicalDetails);
}
