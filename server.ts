import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

interface ModelAttemptInfo {
  model: string;
  status: 'success' | 'failed';
  durationMs: number;
  httpStatus?: number;
  errorCode?: string | number;
  error?: string;
}

// Deep error extractor from Gemini SDK / API errors to avoid [object Object]
function extractTechnicalErrorInfo(err: unknown): {
  message: string;
  code?: string | number;
  httpStatus: number;
  raw: string;
} {
  let message = 'Unknown Gemini API error';
  let code: string | number | undefined;
  let httpStatus = 500;
  let raw = '';

  if (err instanceof Error) {
    message = err.message || 'Error occurred';
    raw = err.message;
    if ('status' in err && typeof (err as any).status === 'number') {
      httpStatus = (err as any).status;
      code = (err as any).status;
    }
  } else if (typeof err === 'object' && err !== null) {
    try {
      raw = JSON.stringify(err);
      message = (err as any).message || (err as any).error || raw;
    } catch {
      raw = String(err);
      message = raw;
    }
  } else {
    message = String(err);
    raw = message;
  }

  // Parse if message is a JSON string like {"error":{"code":503,"message":"...","status":"UNAVAILABLE"}}
  try {
    const parsed = JSON.parse(message);
    if (parsed?.error) {
      if (typeof parsed.error === 'object') {
        if (parsed.error.message) message = parsed.error.message;
        if (parsed.error.code) {
          code = parsed.error.code;
          if (typeof parsed.error.code === 'number') httpStatus = parsed.error.code;
        }
        if (parsed.error.status) code = parsed.error.status;
      } else if (typeof parsed.error === 'string') {
        message = parsed.error;
      }
    }
  } catch {
    // raw is not a JSON string
  }

  // Sanitize message so it never is literally "[object Object]"
  if (message === '[object Object]' || message.includes('[object Object]')) {
    message = raw && raw !== '[object Object]' ? raw : 'An unexpected error object was received from the API.';
  }

  return { message, code, httpStatus, raw };
}

// Prioritized models: reliable, high-speed flash-lite models first to bypass temporary 503 spikes
const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.6-flash',
  'gemini-flash-latest',
  'gemini-3.8-flash',
];

// Diagnostic test endpoint for Gemini AI with full technical telemetry
app.get('/api/ai/test', async (_req, res) => {
  const ai = getGenAI();
  if (!ai) {
    res.status(503).json({
      status: 'error',
      message: 'GEMINI_API_KEY is not configured in server environment secrets.',
      technicalDetails: {
        httpStatus: 503,
        errorCode: 'MISSING_API_KEY',
        message: 'GEMINI_API_KEY is not set or empty in environment.',
        modelsAttempted: [],
        timestamp: new Date().toISOString(),
        apiKeyConfigured: false,
      },
    });
    return;
  }

  const attempts: ModelAttemptInfo[] = [];

  for (const model of CANDIDATE_MODELS) {
    const t0 = Date.now();
    try {
      const resp = await ai.models.generateContent({
        model,
        contents: 'Ping test. Reply with exactly: PONG',
      });
      const durationMs = Date.now() - t0;
      attempts.push({
        model,
        status: 'success',
        durationMs,
      });

      res.json({
        status: 'ok',
        activeModel: model,
        durationMs,
        response: resp.text?.trim(),
        technicalDetails: {
          httpStatus: 200,
          errorCode: 'OK',
          message: `Connected successfully to ${model}`,
          modelsAttempted: attempts,
          timestamp: new Date().toISOString(),
          apiKeyConfigured: true,
        },
      });
      return;
    } catch (err: unknown) {
      const durationMs = Date.now() - t0;
      const errInfo = extractTechnicalErrorInfo(err);
      attempts.push({
        model,
        status: 'failed',
        durationMs,
        httpStatus: errInfo.httpStatus,
        errorCode: errInfo.code,
        error: errInfo.message,
      });
      console.warn(`Test route model ${model} failed in ${durationMs}ms [${errInfo.code || errInfo.httpStatus}]: ${errInfo.message}`);
    }
  }

  const lastAttempt = attempts[attempts.length - 1];
  res.status(500).json({
    status: 'error',
    message: 'All candidate Gemini models failed the ping test.',
    technicalDetails: {
      httpStatus: 500,
      errorCode: lastAttempt?.errorCode || 'ALL_MODELS_FAILED',
      message: 'All candidate Gemini models failed.',
      modelsAttempted: attempts,
      timestamp: new Date().toISOString(),
      apiKeyConfigured: true,
    },
  });
});

// Generate Clue API Endpoint using Gemini API with resilient fallback and deep diagnostics
app.post('/api/ai/generate-clue', async (req, res) => {
  try {
    const { prompt, word } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Missing or invalid prompt string in request body.',
        technicalDetails: {
          httpStatus: 400,
          errorCode: 'INVALID_REQUEST',
          message: 'Missing or invalid prompt string in request body.',
          modelsAttempted: [],
          timestamp: new Date().toISOString(),
          apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
        },
      });
      return;
    }

    const ai = getGenAI();
    if (!ai) {
      res.status(503).json({
        success: false,
        error: 'GEMINI_API_KEY is not configured in server environment secrets. Please configure it in Settings > Secrets.',
        technicalDetails: {
          httpStatus: 503,
          errorCode: 'MISSING_API_KEY',
          message: 'GEMINI_API_KEY environment variable is missing on the server.',
          modelsAttempted: [],
          timestamp: new Date().toISOString(),
          apiKeyConfigured: false,
        },
      });
      return;
    }

    const attempts: ModelAttemptInfo[] = [];
    let successfulText: string | null = null;
    let usedModel = '';

    // Attempt generation across prioritized candidate models
    for (const model of CANDIDATE_MODELS) {
      const t0 = Date.now();
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.75,
          },
        });

        const durationMs = Date.now() - t0;
        successfulText = response.text || '';
        usedModel = model;
        attempts.push({
          model,
          status: 'success',
          durationMs,
        });
        break;
      } catch (err: unknown) {
        const durationMs = Date.now() - t0;
        const errInfo = extractTechnicalErrorInfo(err);
        attempts.push({
          model,
          status: 'failed',
          durationMs,
          httpStatus: errInfo.httpStatus,
          errorCode: errInfo.code,
          error: errInfo.message,
        });
        console.warn(`Model ${model} request failed in ${durationMs}ms [${errInfo.code || errInfo.httpStatus}]: ${errInfo.message}`);
      }
    }

    if (successfulText !== null) {
      res.json({
        success: true,
        text: successfulText,
        modelUsed: usedModel,
        promptSent: prompt,
        word: word || '',
        technicalDetails: {
          httpStatus: 200,
          errorCode: 'OK',
          message: `Generated with ${usedModel}`,
          modelsAttempted: attempts,
          timestamp: new Date().toISOString(),
          apiKeyConfigured: true,
        },
      });
      return;
    }

    // If all models failed, compose structured technical response
    const lastAttempt = attempts[attempts.length - 1];
    const primaryErrorMsg = lastAttempt?.error || 'All candidate Gemini models failed to generate content.';
    const responseStatus = lastAttempt?.httpStatus && lastAttempt.httpStatus >= 400 && lastAttempt.httpStatus <= 599
      ? lastAttempt.httpStatus
      : 503;

    res.status(responseStatus).json({
      success: false,
      error: primaryErrorMsg,
      technicalDetails: {
        httpStatus: responseStatus,
        errorCode: lastAttempt?.errorCode || 'SERVICE_UNAVAILABLE',
        message: primaryErrorMsg,
        modelsAttempted: attempts,
        timestamp: new Date().toISOString(),
        apiKeyConfigured: true,
      },
    });
  } catch (error: unknown) {
    const errInfo = extractTechnicalErrorInfo(error);
    console.error('Gemini generate clue fatal route error:', error);
    res.status(errInfo.httpStatus || 500).json({
      success: false,
      error: errInfo.message,
      technicalDetails: {
        httpStatus: errInfo.httpStatus || 500,
        errorCode: errInfo.code || 'INTERNAL_SERVER_ERROR',
        message: errInfo.message,
        rawError: errInfo.raw,
        modelsAttempted: [],
        timestamp: new Date().toISOString(),
        apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
      },
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
