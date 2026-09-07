import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

// WePlay Who's the Spy Screenshot Analysis Endpoint
app.post('/api/ai/analyze-screenshot', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', apiKey, model } = req.body || {};
    const headerKey =
      typeof req.headers['x-gemini-api-key'] === 'string' ? req.headers['x-gemini-api-key'] : undefined;
    const effectiveCustomKey = apiKey || headerKey;

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      res.status(400).json({ error: 'Missing imageBase64 in request body.' });
      return;
    }

    const { ai, isCustomKey } = resolveGenAI(effectiveCustomKey);
    if (!ai) {
      res.status(400).json({
        error:
          'Gemini API key is not configured. Please set your personal Gemini API key in Settings or configure GEMINI_API_KEY.',
      });
      return;
    }

    // Clean base64 data string
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
    const effectiveMimeType = mimeType || 'image/jpeg';

    const candidateModels: string[] = [];
    if (model && typeof model === 'string' && model.trim()) {
      candidateModels.push(model.trim());
    }
    // gemini-3.8-flash and gemini-3.1-flash-lite are great for vision tasks
    for (const m of ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview']) {
      if (!candidateModels.includes(m)) {
        candidateModels.push(m);
      }
    }

    const promptText = `You are a specialized UI analysis and OCR AI for the mobile social deduction game "Who's the Spy" (WePlay / 谁是卧底).
Examine this mobile game screenshot carefully.

Tasks:
1. Verify if this image is a screenshot from WePlay "Who's the Spy" (or a similar Who's the Spy / Undercover social game). Check for game cards, player avatars, round timers, or secret role cards.
2. Locate the PRIMARY secret word assigned to the player (e.g. displayed inside the central role card, popup banner, or top/bottom status bar, such as "Kata Anda: [KATA]", "Your Word: [WORD]", or the word name on the card).
3. Detect the exact 2D bounding box of the secret word characters in normalized coordinates [ymin, xmin, ymax, xmax] from 0 to 1000 (0,0 is top-left, 1000,1000 is bottom-right). Be as tight as possible around the letters of the word.
4. Detect the 2D bounding box of the containing card or pill [ymin, xmin, ymax, xmax] (0 to 1000).
5. Extract styling properties:
   - "textColor": exact hex color of the word letters (e.g. "#FFFFFF", "#2C1A0D", "#FFEB3B").
   - "cardBgColor": dominant background hex color directly behind the letters on the card (e.g. "#FFE082", "#2B1A4A", "#FFFFFF").
   - "isGradient": true if the card has a gradient background.
   - "gradientColors": array of 2 hex colors [top/start, bottom/end] if gradient, or null.
   - "fontWeight": "bold" | "extra-bold" | "normal".
   - "hasOutlineOrStroke": boolean.
   - "strokeColor": hex color of text outline/stroke if any, or null.
   - "hasShadow": boolean.
   - "textTransform": "uppercase" | "capitalize" | "lowercase" | "none".
   - "detectedWord": the exact string of the word as displayed in the image.
   - "roleType": "civilian" | "undercover" | "mr_white" | "unknown".
   - "screenType": "role_card" | "gameplay_table" | "voting" | "unknown".
   - "confidence": number between 0.0 and 1.0.
   - "isWePlayOrSpyGame": boolean.
   - "explanation": brief note of what you observed (e.g. "Found secret word 'KOPI' in center yellow role card").

Return ONLY valid JSON matching this schema, with no markdown code blocks, backticks, or extra commentary:
{
  "isWePlayOrSpyGame": true,
  "detectedWord": "EXAMPLE",
  "confidence": 0.95,
  "roleType": "civilian",
  "screenType": "role_card",
  "box2d": [450, 300, 520, 700],
  "cardBox2d": [380, 200, 600, 800],
  "textColor": "#2B1800",
  "cardBgColor": "#FFD54F",
  "isGradient": false,
  "gradientColors": null,
  "fontWeight": "bold",
  "hasOutlineOrStroke": false,
  "strokeColor": null,
  "hasShadow": false,
  "textTransform": "uppercase",
  "explanation": "Found word on role card"
}`;

    let lastError: Error | null = null;
    let successfulAnalysis: any = null;
    let modelUsed = '';

    for (const targetModel of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: targetModel,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: effectiveMimeType,
                  data: cleanBase64,
                },
              },
              {
                text: promptText,
              },
            ],
          },
        });

        const rawText = response.text || '';
        let cleanJson = rawText.trim();
        if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(cleanJson);
        // Ensure box2d exists and has 4 numbers
        if (!Array.isArray(parsed.box2d) || parsed.box2d.length !== 4) {
          parsed.box2d = [450, 250, 550, 750];
        }
        successfulAnalysis = parsed;
        modelUsed = targetModel;
        break;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const rawMsg = lastError.message;
        const friendly = parseGeminiErrorMessage(rawMsg);
        if (friendly.toLowerCase().includes('api_key_invalid') || friendly.toLowerCase().includes('api key not valid')) {
          res.status(401).json({ error: friendly });
          return;
        }
        console.warn(`Vision model ${targetModel} failed (${rawMsg.slice(0, 100)}). Trying next model...`);
      }
    }

    if (successfulAnalysis) {
      res.json({
        success: true,
        analysis: successfulAnalysis,
        modelUsed,
        isCustomKey,
      });
      return;
    }

    const rawError = lastError ? lastError.message : 'Failed to analyze screenshot.';
    res.status(503).json({ error: parseGeminiErrorMessage(rawError) });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error processing image.';
    res.status(500).json({ error: parseGeminiErrorMessage(msg) });
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
