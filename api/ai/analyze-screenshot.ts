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

    const effectiveKey = (customKey && typeof customKey === 'string' ? customKey.trim() : '') || process.env.GEMINI_API_KEY;
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
   - "explanation": brief note of what you observed.

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
        if (!Array.isArray(parsed.box2d) || parsed.box2d.length !== 4) {
          parsed.box2d = [450, 250, 550, 750];
        }
        successfulAnalysis = parsed;
        modelUsed = targetModel;
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

    if (successfulAnalysis) {
      sendJson(res, 200, {
        success: true,
        analysis: successfulAnalysis,
        modelUsed,
        isCustomKey,
      });
      return;
    }

    sendJson(res, 503, { error: lastError ? lastError.message : 'Failed to analyze screenshot.' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error processing image.';
    sendJson(res, 500, { error: msg });
  }
}
