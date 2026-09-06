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

// Clean error extractor from Gemini SDK
function parseGeminiErrorMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) {
      return parsed.error.message;
    }
  } catch {
    // raw is not a JSON string
  }
  return raw;
}

const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];

// Quick test endpoint for Gemini AI
app.get('/api/ai/test', async (_req, res) => {
  const ai = getGenAI();
  if (!ai) {
    res.status(503).json({
      status: 'error',
      message: 'GEMINI_API_KEY is not configured in server environment secrets.',
    });
    return;
  }

  for (const model of CANDIDATE_MODELS) {
    try {
      const resp = await ai.models.generateContent({
        model,
        contents: 'Ping test. Reply with exactly: PONG',
      });
      res.json({
        status: 'ok',
        activeModel: model,
        response: resp.text?.trim(),
      });
      return;
    } catch (err: unknown) {
      console.warn(`Test route model ${model} failed, trying next...`);
    }
  }

  res.status(500).json({
    status: 'error',
    message: 'All candidate Gemini models failed test request.',
  });
});

// Generate Clue API Endpoint using Gemini API with model fallback
app.post('/api/ai/generate-clue', async (req, res) => {
  try {
    const { prompt, word } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Missing or invalid prompt string in request body.' });
      return;
    }

    const ai = getGenAI();
    if (!ai) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured in server environment secrets. Please configure it in Settings > Secrets.',
      });
      return;
    }

    let lastError: Error | null = null;
    let successfulText: string | null = null;
    let usedModel: string = '';

    // Attempt generation across candidate models if one experiences high demand
    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            temperature: 0.75,
          },
        });

        successfulText = response.text || '';
        usedModel = model;
        break;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const rawMsg = lastError.message;
        console.warn(`Model ${model} request failed (${rawMsg.slice(0, 100)}). Falling back if available...`);
      }
    }

    if (successfulText !== null) {
      res.json({
        success: true,
        text: successfulText,
        modelUsed: usedModel,
        promptSent: prompt,
        word: word || '',
      });
      return;
    }

    const rawError = lastError ? lastError.message : 'Unknown Gemini error';
    const friendlyError = parseGeminiErrorMessage(rawError);
    console.error('All Gemini models failed. Error:', friendlyError);
    res.status(503).json({
      error: friendlyError,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate clue from Gemini API.';
    console.error('Gemini generate clue route error:', error);
    res.status(500).json({
      error: parseGeminiErrorMessage(message),
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
