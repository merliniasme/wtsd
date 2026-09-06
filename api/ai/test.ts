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
  const body = await readBody(req);
  const headerKey = req.headers['x-gemini-api-key'];
  const customKey =
    body.apiKey || (typeof headerKey === 'string' ? headerKey : undefined);
  const requestedModel = body.model;

  const effectiveKey = (customKey && typeof customKey === 'string' ? customKey.trim() : '') || process.env.GEMINI_API_KEY;
  const serverKeyConfigured = Boolean(process.env.GEMINI_API_KEY);
  const isCustomKey = Boolean(customKey && typeof customKey === 'string' && customKey.trim());

  if (!effectiveKey) {
    sendJson(res, 400, {
      status: 'error',
      serverKeyConfigured,
      isCustomKey,
      message:
        'No Gemini API Key found. Please provide a key in Settings or configure GEMINI_API_KEY in environment variables.',
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

  const modelsToTest: string[] = [];
  if (requestedModel && typeof requestedModel === 'string' && requestedModel.trim()) {
    modelsToTest.push(requestedModel.trim());
  }
  for (const m of SUPPORTED_MODELS) {
    if (!modelsToTest.includes(m)) {
      modelsToTest.push(m);
    }
  }

  const startTime = Date.now();
  let lastErrMessage = '';

  for (const model of modelsToTest) {
    try {
      const resp = await ai.models.generateContent({
        model,
        contents: 'Quick connection test. Reply with: PONG',
      });
      const latencyMs = Date.now() - startTime;
      sendJson(res, 200, {
        status: 'ok',
        activeModel: model,
        response: resp.text?.trim() || 'PONG',
        latencyMs,
        isCustomKey,
        serverKeyConfigured,
      });
      return;
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : String(err);
      lastErrMessage = raw;
      if (raw.toLowerCase().includes('api_key_invalid') || raw.toLowerCase().includes('api key not valid')) {
        break;
      }
    }
  }

  sendJson(res, 500, {
    status: 'error',
    serverKeyConfigured,
    isCustomKey,
    message: lastErrMessage || 'Failed to connect to Gemini API.',
  });
}
