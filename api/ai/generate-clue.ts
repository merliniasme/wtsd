import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

const SUPPORTED_MODELS = [
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.1-pro-preview',
];

async function readBody(req: IncomingMessage): Promise<any> {
  if ((req as any).body) return (req as any).body;
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function sendJson(res: ServerResponse, status: number, data: any) {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = status;
  res.end(JSON.stringify(data));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const body = await readBody(req);
    const { prompt, word, apiKey, model, temperature } = body;
    const headerKey = req.headers['x-gemini-api-key'];
    const customKey =
      apiKey || (typeof headerKey === 'string' ? headerKey : undefined);

    if (!prompt || typeof prompt !== 'string') {
      sendJson(res, 400, { error: 'Missing prompt in request body.' });
      return;
    }

    const effectiveKey = (customKey && typeof customKey === 'string' ? customKey.trim() : '') || process.env.GEMINI_API_KEY;
    const isCustomKey = Boolean(customKey && typeof customKey === 'string' && customKey.trim());

    if (!effectiveKey) {
      sendJson(res, 400, {
        error:
          'Gemini API key is not configured. Please enter your personal Gemini API Key in Settings or set GEMINI_API_KEY in environment variables.',
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey: effectiveKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const candidateModels: string[] = [];
    if (model && typeof model === 'string' && model.trim()) {
      candidateModels.push(model.trim());
    }
    for (const m of SUPPORTED_MODELS) {
      if (!candidateModels.includes(m)) {
        candidateModels.push(m);
      }
    }

    const parsedTemp =
      typeof temperature === 'number' && !isNaN(temperature)
        ? Math.max(0.1, Math.min(1.0, temperature))
        : 0.75;

    let lastError: Error | null = null;
    let successfulText: string | null = null;
    let usedModel = '';

    for (const targetModel of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: targetModel,
          contents: prompt,
          config: {
            temperature: parsedTemp,
          },
        });

        successfulText = response.text || '';
        usedModel = targetModel;
        break;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const rawMsg = lastError.message;
        if (rawMsg.toLowerCase().includes('api_key_invalid') || rawMsg.toLowerCase().includes('api key not valid')) {
          sendJson(res, 401, { error: rawMsg });
          return;
        }
      }
    }

    if (successfulText !== null) {
      sendJson(res, 200, {
        success: true,
        text: successfulText,
        modelUsed: usedModel,
        promptSent: prompt,
        word: word || '',
        isCustomKey,
      });
      return;
    }

    sendJson(res, 503, {
      error: lastError ? lastError.message : 'All Gemini models failed.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to generate clue.';
    sendJson(res, 500, { error: msg });
  }
}
