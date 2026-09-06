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

// Generate Clue API Endpoint using Gemini API
app.post('/api/ai/generate-clue', async (req, res) => {
  try {
    const { prompt, word } = req.body;
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

    // Call Gemini API using gemini-3.8-flash for text task
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        temperature: 0.75,
      },
    });

    const responseText = response.text || '';
    res.json({
      success: true,
      text: responseText,
      promptSent: prompt,
      word: word || '',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate clue from Gemini API.';
    console.error('Gemini generate clue error:', error);
    res.status(500).json({
      error: message,
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
