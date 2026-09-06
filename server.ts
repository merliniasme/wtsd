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

// Lazy-initialized default Gemini client for environment key
let defaultAiClient: GoogleGenAI | null = null;
function getDefaultGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!defaultAiClient) {
    defaultAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return defaultAiClient;
}

// Resolve Gemini client from either client-provided key or environment key
function resolveGenAI(clientKey?: string): { ai: GoogleGenAI | null; isCustomKey: boolean } {
  const trimmed = typeof clientKey === 'string' ? clientKey.trim() : '';
  if (trimmed) {
    return {
      ai: new GoogleGenAI({
        apiKey: trimmed,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      }),
      isCustomKey: true,
    };
  }
  return {
    ai: getDefaultGenAI(),
    isCustomKey: false,
  };
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

const SUPPORTED_MODELS = [
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.1-pro-preview',
];

// Configuration status endpoint
app.get('/api/ai/config', (_req, res) => {
  const serverKeyConfigured = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    serverKeyConfigured,
    defaultModel: 'gemini-3.8-flash',
    supportedModels: [
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
        description: 'Advanced reasoning for subtle deception and complex word strategies.',
      },
    ],
  });
});

// Test endpoint for Gemini AI (supports GET and POST with custom key/model)
const handleAiTest = async (req: express.Request, res: express.Response) => {
  const customKey =
    (req.body && req.body.apiKey) ||
    (typeof req.headers['x-gemini-api-key'] === 'string' ? req.headers['x-gemini-api-key'] : undefined);
  const requestedModel =
    (req.body && req.body.model) || (typeof req.query.model === 'string' ? req.query.model : undefined);

  const { ai, isCustomKey } = resolveGenAI(customKey);
  const serverKeyConfigured = Boolean(process.env.GEMINI_API_KEY);

  if (!ai) {
    res.status(400).json({
      status: 'error',
      serverKeyConfigured,
      isCustomKey,
      message:
        'No Gemini API Key found. Please provide a key in Settings or configure GEMINI_API_KEY in server environment secrets.',
    });
    return;
  }

  // Determine models to test (prioritize requested model if provided)
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
      res.json({
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
      lastErrMessage = parseGeminiErrorMessage(raw);
      console.warn(`Test model ${model} failed: ${lastErrMessage}`);
      // If error is clearly an invalid API key (400 or 403 API_KEY_INVALID), don't keep trying all models
      if (lastErrMessage.toLowerCase().includes('api_key_invalid') || lastErrMessage.toLowerCase().includes('api key not valid')) {
        break;
      }
    }
  }

  res.status(500).json({
    status: 'error',
    serverKeyConfigured,
    isCustomKey,
    message: lastErrMessage || 'Failed to connect to Gemini API across candidate models.',
  });
};

app.get('/api/ai/test', handleAiTest);
app.post('/api/ai/test', handleAiTest);

// Generate Clue API Endpoint using Gemini API with configurable key, model, & temperature
app.post('/api/ai/generate-clue', async (req, res) => {
  try {
    const { prompt, word, apiKey, model, temperature } = req.body || {};
    const headerKey =
      typeof req.headers['x-gemini-api-key'] === 'string' ? req.headers['x-gemini-api-key'] : undefined;
    const effectiveCustomKey = apiKey || headerKey;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Missing or invalid prompt string in request body.' });
      return;
    }

    const { ai, isCustomKey } = resolveGenAI(effectiveCustomKey);
    if (!ai) {
      res.status(400).json({
        error:
          'Gemini API key is not configured. Please set your personal Gemini API key in Settings > Gemini AI Configuration, or configure GEMINI_API_KEY in server secrets.',
      });
      return;
    }

    // Build model prioritization list
    const candidateModels: string[] = [];
    if (model && typeof model === 'string' && model.trim()) {
      candidateModels.push(model.trim());
    }
    for (const m of SUPPORTED_MODELS) {
      if (!candidateModels.includes(m)) {
        candidateModels.push(m);
      }
    }

    // Parse and constrain temperature
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
        console.warn(`Model ${targetModel} request failed (${rawMsg.slice(0, 120)}).`);
        // If invalid API key, fail immediately without exhausting models
        const friendly = parseGeminiErrorMessage(rawMsg);
        if (friendly.toLowerCase().includes('api_key_invalid') || friendly.toLowerCase().includes('api key not valid')) {
          res.status(401).json({ error: friendly });
          return;
        }
      }
    }

    if (successfulText !== null) {
      res.json({
        success: true,
        text: successfulText,
        modelUsed: usedModel,
        promptSent: prompt,
        word: word || '',
        isCustomKey,
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
