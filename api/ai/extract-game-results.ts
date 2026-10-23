import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';

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
    const { imageBase64, mimeType = 'image/jpeg', apiKey, model } = body || {};
    const headerKey = req.headers['x-gemini-api-key'];
    const customKey = apiKey || (typeof headerKey === 'string' ? headerKey : undefined);

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      sendJson(res, 400, { error: 'Missing imageBase64 in request body.' });
      return;
    }

    const effectiveKey =
      (customKey && typeof customKey === 'string' ? customKey.trim() : '') ||
      process.env.GEMINI_API_KEY;
    const isCustomKey = Boolean(customKey && typeof customKey === 'string' && customKey.trim());

    if (!effectiveKey) {
      sendJson(res, 400, {
        error:
          'Gemini API key is not configured. Please enter your personal Gemini API Key in Settings or configure GEMINI_API_KEY in environment variables.',
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

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
    const effectiveMimeType = mimeType || 'image/jpeg';

    const candidateModels: string[] = [];
    if (model && typeof model === 'string' && model.trim()) {
      candidateModels.push(model.trim());
    }
    for (const m of [
      'gemini-3.8-flash',
      'gemini-flash-latest',
      'gemini-3.1-flash-lite',
      'gemini-3.1-pro-preview',
    ]) {
      if (!candidateModels.includes(m)) {
        candidateModels.push(m);
      }
    }

    const promptText = `You are a high-precision OCR and game analysis AI specialized in the mobile party game "Who's the Spy" / "Siapa Spionnya" (WePlay / 谁是卧底).
Examine this mobile screenshot of a match result or game-over screen.

At the conclusion of a match in WePlay "Who's the Spy", the game displays the outcome, which prominently includes:
1. The word for Civilians / Villagers (often labeled in Indonesian: "Kata Warga", "Warga", "Orang Baik", or in English: "Civilian Word", "Villager", or Chinese: "平民词").
2. The word for the Spy / Undercover (often labeled: "Kata Spion", "Spion", "Undercover", "Mata-mata", "Spy Word", or "卧底词").
3. Winner announcement (e.g. "Warga Menang" / "Civilians Win" or "Spion Menang" / "Spy Wins").

Instructions:
- Detect if this is indeed a WePlay or Who's the Spy game result or card screen.
- Extract the Civilian / Villager word and clean it (remove labels like "Kata Warga: ", brackets, quotes, or whitespace).
- Extract the Spy / Undercover word and clean it (remove labels like "Kata Spion: ", brackets, quotes, or whitespace).
- If words are in Indonesian (very common in WePlay SE Asia), extract the exact Indonesian terms (e.g. "Matahari", "Bulan", "Kopi", "Teh", "Singa", "Harimau").
- Determine which team won if visible ("civilian", "spy", or "unknown").
- Provide a confidence score between 0.0 and 1.0.

Return ONLY a valid JSON object strictly matching this schema with no markdown formatting, no backticks, and no extra commentary:
{
  "isWePlayResultScreen": true,
  "civilianWord": "TERM_FOR_CIVILIAN",
  "spyWord": "TERM_FOR_SPY",
  "confidence": 0.95,
  "winner": "civilian",
  "notes": "Found Kata Warga: TERM and Kata Spion: TERM on result screen"
}`;

    let lastError: Error | null = null;
    let successfulExtraction: any = null;
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
        // Clean terms
        if (parsed.civilianWord && typeof parsed.civilianWord === 'string') {
          parsed.civilianWord = parsed.civilianWord.replace(/^(kata\s+(warga|sipil|orang\s+baik)\s*[:：\-]?\s*)/i, '').trim();
          parsed.civilianWord = parsed.civilianWord.replace(/^["'\[\(]|["'\]\)]$/g, '').trim();
        }
        if (parsed.spyWord && typeof parsed.spyWord === 'string') {
          parsed.spyWord = parsed.spyWord.replace(/^(kata\s+(spion|undercover|mata\-mata)\s*[:：\-]?\s*)/i, '').trim();
          parsed.spyWord = parsed.spyWord.replace(/^["'\[\(]|["'\]\)]$/g, '').trim();
        }

        successfulExtraction = parsed;
        modelUsed = targetModel;
        break;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const rawMsg = lastError.message;
        if (
          rawMsg.toLowerCase().includes('api_key_invalid') ||
          rawMsg.toLowerCase().includes('api key not valid')
        ) {
          sendJson(res, 401, { error: rawMsg });
          return;
        }
      }
    }

    if (successfulExtraction) {
      sendJson(res, 200, {
        success: true,
        data: successfulExtraction,
        modelUsed,
        isCustomKey,
      });
      return;
    }

    sendJson(res, 503, {
      error: lastError ? lastError.message : 'Failed to extract words from game results screenshot.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error extracting game results.';
    sendJson(res, 500, { error: msg });
  }
}
