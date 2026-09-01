import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
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

const app = express();
const PORT = 3000;

app.use(express.json());

// API route for generating AI clue
app.post('/api/ai/clue', async (req, res) => {
  try {
    const { word1, word2 } = req.body;
    if (!word1 || !word2 || typeof word1 !== 'string' || typeof word2 !== 'string') {
      return res.status(400).json({ error: 'Both word1 and word2 are required.' });
    }

    const ai = getGeminiClient();
    const prompt = `Berikan clue yang bisa di validasi ke kosa kata "${word1.trim()}" dan "${word2.trim()}", tuliskan clue yang tidak umum tapi tidak spesifik terhadap salah satu kosa kata, berikan juga detail masing masing cabang validasi`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'Kamu adalah asisten ahli pembuat clue game "Who is the Undercover / Siapa yang Spy". Tugasmu adalah memberikan petunjuk (clue) yang cerdas, tidak terlalu umum tapi juga tidak spesifik terhadap salah satu kata saja, sehingga kedua pemain bisa memvalidasinya secara logis. Berikan output dalam format JSON.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clue: {
              type: Type.STRING,
              description: 'Clue atau petunjuk yang cerdas dan berimbang untuk kedua kosa kata',
            },
            validationWord1: {
              type: Type.STRING,
              description: `Detail cabang validasi bagaimana clue ini terhubung ke kosa kata ${word1.trim()}`,
            },
            validationWord2: {
              type: Type.STRING,
              description: `Detail cabang validasi bagaimana clue ini terhubung ke kosa kata ${word2.trim()}`,
            },
            description: {
              type: Type.STRING,
              description: 'Deskripsi singkat dan analisa mengapa clue ini cocok dan seimbang',
            },
          },
          required: ['clue', 'validationWord1', 'validationWord2'],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error('No text returned by AI model.');
    }

    const parsed = JSON.parse(text);
    return res.json({
      success: true,
      clue: parsed.clue,
      validationWord1: parsed.validationWord1,
      validationWord2: parsed.validationWord2,
      description: parsed.description || '',
    });
  } catch (error: any) {
    console.error('Error generating AI clue:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate AI clue. Please try again.',
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
