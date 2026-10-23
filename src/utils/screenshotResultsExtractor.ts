import { Word, RelationTag, ExtractedGameResult, GameResultsExtractionResponse } from '../types';
import { getCustomGeminiApiKey, getSelectedGeminiModel } from './aiClue';
import { findWordByTerm } from './wordGraph';

/**
 * Resizes an image file to a sensible resolution for fast OCR upload.
 */
export async function prepareScreenshotForOcr(
  file: File,
  maxDimension: number = 1280
): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image element.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original
          resolve({
            base64: String(reader.result),
            mimeType: file.type || 'image/jpeg',
            previewUrl: URL.createObjectURL(file),
          });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.88);
        resolve({
          base64: compressedBase64,
          mimeType: 'image/jpeg',
          previewUrl: URL.createObjectURL(file),
        });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Direct in-browser Gemini Vision API call fallback for static hosts.
 */
async function callDirectGeminiVisionResultsApi(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  model: string = 'gemini-3.8-flash'
): Promise<GameResultsExtractionResponse> {
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
  const effectiveMimeType = mimeType || 'image/jpeg';

  const promptText = `You are a high-precision OCR and game analysis AI specialized in the mobile party game "Who's the Spy" / "Siapa Spionnya" (WePlay / 谁是卧底).
Examine this mobile screenshot of a match result or game-over screen.

At the conclusion of a match in WePlay "Who's the Spy", the game displays the outcome, which prominently includes:
1. The word for Civilians / Villagers (often labeled: "Kata Warga", "Warga", "Orang Baik", "Civilian Word", "Villager", or "平民词").
2. The word for the Spy / Undercover (often labeled: "Kata Spion", "Spion", "Undercover", "Mata-mata", "Spy Word", or "卧底词").
3. Winner announcement ("Warga Menang" / "Civilians Win" or "Spion Menang" / "Spy Wins").

Instructions:
- Detect if this is indeed a WePlay or Who's the Spy game result or card screen.
- Extract the Civilian / Villager word and clean it.
- Extract the Spy / Undercover word and clean it.
- Determine winner if visible ("civilian", "spy", or "unknown").
- Provide a confidence score between 0.0 and 1.0.

Return ONLY a valid JSON object strictly matching this schema with no markdown formatting:
{
  "isWePlayResultScreen": true,
  "civilianWord": "TERM_FOR_CIVILIAN",
  "spyWord": "TERM_FOR_SPY",
  "confidence": 0.95,
  "winner": "civilian",
  "notes": "Found Kata Warga and Kata Spion"
}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [
      {
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
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini direct API failed (${res.status}): ${errorText.slice(0, 150)}`);
  }

  const json = await res.json();
  const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  let cleanJson = rawText.trim();
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  const parsed = JSON.parse(cleanJson);
  if (parsed.civilianWord && typeof parsed.civilianWord === 'string') {
    parsed.civilianWord = parsed.civilianWord.replace(/^(kata\s+(warga|sipil|orang\s+baik)\s*[:：\-]?\s*)/i, '').trim();
    parsed.civilianWord = parsed.civilianWord.replace(/^["'\[\(]|["'\]\)]$/g, '').trim();
  }
  if (parsed.spyWord && typeof parsed.spyWord === 'string') {
    parsed.spyWord = parsed.spyWord.replace(/^(kata\s+(spion|undercover|mata\-mata)\s*[:：\-]?\s*)/i, '').trim();
    parsed.spyWord = parsed.spyWord.replace(/^["'\[\(]|["'\]\)]$/g, '').trim();
  }

  return parsed;
}

/**
 * Extracts game result words from a single screenshot.
 */
export async function extractGameResultsFromScreenshot(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  options?: { apiKey?: string; model?: string }
): Promise<GameResultsExtractionResponse> {
  const customKey = options?.apiKey || getCustomGeminiApiKey();
  const selectedModel = options?.model || getSelectedGeminiModel();

  try {
    const res = await fetch('/api/ai/extract-game-results', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(customKey ? { 'x-gemini-api-key': customKey } : {}),
      },
      body: JSON.stringify({
        imageBase64,
        mimeType,
        apiKey: customKey || undefined,
        model: selectedModel || undefined,
      }),
    });

    const rawText = await res.text();
    let data: any = {};
    try {
      data = JSON.parse(rawText);
    } catch {
      if (res.status === 404 && customKey) {
        return callDirectGeminiVisionResultsApi(imageBase64, mimeType, customKey, selectedModel);
      }
      throw new Error(`Server returned non-JSON (${res.status}): ${rawText.slice(0, 100)}`);
    }

    if (!res.ok) {
      if (res.status === 404 && customKey) {
        return callDirectGeminiVisionResultsApi(imageBase64, mimeType, customKey, selectedModel);
      }
      throw new Error(data.error || 'Failed to extract words from screenshot.');
    }

    if (data.data) {
      return data.data;
    }
  } catch (err: unknown) {
    if (customKey) {
      try {
        return await callDirectGeminiVisionResultsApi(imageBase64, mimeType, customKey, selectedModel);
      } catch (directErr: unknown) {
        const msg = directErr instanceof Error ? directErr.message : String(directErr);
        throw new Error(`Direct AI analysis failed: ${msg}`);
      }
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg);
  }

  throw new Error('No extraction data received from Gemini AI.');
}

/**
 * Checks if a word pair already exists in the dictionary.
 */
export function checkPairDuplicate(
  words: Word[],
  termA: string,
  termB: string
): { isDuplicate: boolean; duplicateDetails?: string; existingTag?: RelationTag } {
  const cleanA = termA.trim();
  const cleanB = termB.trim();
  if (!cleanA || !cleanB) return { isDuplicate: false };

  const wordA = findWordByTerm(words, cleanA);
  const wordB = findWordByTerm(words, cleanB);

  if (wordA && wordB) {
    const rel = wordA.relations.find((r) => r.targetWordId === wordB.id);
    if (rel) {
      return {
        isDuplicate: true,
        duplicateDetails: `Pair already linked under [${rel.tag.toUpperCase()}]`,
        existingTag: rel.tag,
      };
    }
  }

  if (wordA && !wordB) {
    return {
      isDuplicate: false,
      duplicateDetails: `"${cleanA}" exists in dictionary, "${cleanB}" is new`,
    };
  }

  if (!wordA && wordB) {
    return {
      isDuplicate: false,
      duplicateDetails: `"${cleanB}" exists in dictionary, "${cleanA}" is new`,
    };
  }

  return { isDuplicate: false };
}
