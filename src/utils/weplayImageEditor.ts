import { WePlayAnalysisResult, WePlayEditorOptions } from '../types';
import { getCustomGeminiApiKey, getSelectedGeminiModel } from './aiClue';
import { escapeCensoredWord } from './homoglyph';

/**
 * Calls either server-side /api/ai/analyze-screenshot or direct Gemini API fallback
 * to detect the secret word and bounding box from a WePlay screenshot.
 */
export async function analyzeWePlayScreenshot(
  imageBase64: string,
  mimeType: string = 'image/jpeg',
  options?: { apiKey?: string; model?: string }
): Promise<WePlayAnalysisResult> {
  const customKey = options?.apiKey || getCustomGeminiApiKey();
  const selectedModel = options?.model || getSelectedGeminiModel();

  // Try server endpoint first
  try {
    const res = await fetch('/api/ai/analyze-screenshot', {
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
      // If server returned 404 or HTML (static preview host), fall through to direct in-browser Gemini call
      if (res.status === 404 && customKey) {
        return callDirectGeminiVisionApi(imageBase64, mimeType, customKey, selectedModel);
      }
      throw new Error(
        `Server returned non-JSON (${res.status}): ${rawText.slice(0, 100)}`
      );
    }

    if (!res.ok) {
      // If 404 on static host and we have a custom key, try direct
      if (res.status === 404 && customKey) {
        return callDirectGeminiVisionApi(imageBase64, mimeType, customKey, selectedModel);
      }
      throw new Error(data.error || 'Failed to analyze screenshot.');
    }

    if (data.analysis) {
      return normalizeAnalysis(data.analysis);
    }
  } catch (err: unknown) {
    // If network failed or 404 and we have custom key, try direct
    if (customKey) {
      try {
        return await callDirectGeminiVisionApi(imageBase64, mimeType, customKey, selectedModel);
      } catch (directErr: unknown) {
        const msg = directErr instanceof Error ? directErr.message : String(directErr);
        throw new Error(`Direct AI analysis failed: ${msg}`);
      }
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg);
  }

  throw new Error('No analysis data received from Gemini AI.');
}

/**
 * Direct in-browser Gemini Vision API call for static hosts or direct client mode.
 */
async function callDirectGeminiVisionApi(
  imageBase64: string,
  mimeType: string,
  apiKey: string,
  model: string = 'gemini-3.8-flash'
): Promise<WePlayAnalysisResult> {
  const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '').trim();
  const effectiveMimeType = mimeType || 'image/jpeg';

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

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  let data: any = {};
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`Google API returned non-JSON (${response.status})`);
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || `Google API error ${response.status}`;
    throw new Error(errorMsg);
  }

  const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  let cleanJson = textOutput.trim();
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  const parsed = JSON.parse(cleanJson);
  return normalizeAnalysis(parsed);
}

function normalizeAnalysis(parsed: any): WePlayAnalysisResult {
  const box2d = Array.isArray(parsed.box2d) && parsed.box2d.length === 4
    ? [
        Math.max(0, Math.min(1000, Number(parsed.box2d[0]) || 450)),
        Math.max(0, Math.min(1000, Number(parsed.box2d[1]) || 250)),
        Math.max(0, Math.min(1000, Number(parsed.box2d[2]) || 550)),
        Math.max(0, Math.min(1000, Number(parsed.box2d[3]) || 750)),
      ] as [number, number, number, number]
    : [450, 250, 550, 750] as [number, number, number, number];

  return {
    isWePlayOrSpyGame: Boolean(parsed.isWePlayOrSpyGame ?? true),
    detectedWord: String(parsed.detectedWord || '').trim(),
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
    roleType: parsed.roleType || 'civilian',
    screenType: parsed.screenType || 'role_card',
    box2d,
    cardBox2d: Array.isArray(parsed.cardBox2d) ? parsed.cardBox2d : undefined,
    textColor: parsed.textColor || '#2D1A05',
    cardBgColor: parsed.cardBgColor || '#FFD54F',
    isGradient: Boolean(parsed.isGradient),
    gradientColors: Array.isArray(parsed.gradientColors) ? parsed.gradientColors : undefined,
    fontWeight: parsed.fontWeight || 'bold',
    hasOutlineOrStroke: Boolean(parsed.hasOutlineOrStroke),
    strokeColor: parsed.strokeColor || '#FFFFFF',
    hasShadow: Boolean(parsed.hasShadow),
    textTransform: parsed.textTransform || 'uppercase',
    explanation: parsed.explanation || 'Secret word localized successfully.',
  };
}

/**
 * Loads an image from a File, Blob, or URL into an HTMLImageElement
 */
export function loadImageElement(source: File | Blob | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image element: ' + String(e)));

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const url = URL.createObjectURL(source);
      img.src = url;
    }
  });
}

/**
 * Converts a File to Base64 string
 */
export function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const mimeType = file.type || 'image/jpeg';
      resolve({ base64: result, mimeType });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Samples pixel color from canvas at specified coordinate
 */
function sampleColor(ctx: CanvasRenderingContext2D, x: number, y: number): { r: number; g: number; b: number; hex: string } {
  const pixel = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
  const r = pixel[0];
  const g = pixel[1];
  const b = pixel[2];
  const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  return { r, g, b, hex };
}

/**
 * High-Precision Inpainting & Word Replacement Canvas Engine
 * Replaces the original word with the new target word seamlessly.
 */
export function renderEditedWePlayCanvas(
  sourceImage: HTMLImageElement,
  options: WePlayEditorOptions
): { canvas: HTMLCanvasElement; dataUrl: string; wordCoords: { x: number; y: number; width: number; height: number } } {
  const width = sourceImage.naturalWidth || sourceImage.width;
  const height = sourceImage.naturalHeight || sourceImage.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D context not available.');
  }

  // 1. Draw base image
  ctx.drawImage(sourceImage, 0, 0, width, height);

  // 2. Compute pixel coordinates of bounding box (0-1000 scale)
  const [yminNorm, xminNorm, ymaxNorm, xmaxNorm] = options.box2d;
  const ymin = (yminNorm / 1000) * height;
  const xmin = (xminNorm / 1000) * width;
  const ymax = (ymaxNorm / 1000) * height;
  const xmax = (xmaxNorm / 1000) * width;

  const boxW = Math.max(20, xmax - xmin);
  const boxH = Math.max(16, ymax - ymin);

  // Padding around word to cover all original text strokes and shadows
  const padX = Math.round(boxW * 0.08);
  const padY = Math.round(boxH * 0.12);

  const patchX = Math.max(0, xmin - padX);
  const patchY = Math.max(0, ymin - padY);
  const patchW = Math.min(width - patchX, boxW + padX * 2);
  const patchH = Math.min(height - patchY, boxH + padY * 2);

  // 3. Background Inpainting / Seamless Patch Fill
  ctx.save();

  // Sample card colors if auto_sample
  let topSampleHex = options.cardBgColor;
  let bottomSampleHex = options.cardBgColor;

  if (options.blendMode === 'auto_sample') {
    try {
      // Sample directly above the patch and below the patch
      const topY = Math.max(2, patchY - 4);
      const bottomY = Math.min(height - 2, patchY + patchH + 4);
      const midX = patchX + patchW / 2;
      const leftX = patchX + 4;
      const rightX = patchX + patchW - 4;

      const topC = sampleColor(ctx, midX, topY);
      const bottomC = sampleColor(ctx, midX, bottomY);
      const leftC = sampleColor(ctx, leftX, patchY + patchH / 2);
      const rightC = sampleColor(ctx, rightX, patchY + patchH / 2);

      topSampleHex = topC.hex;
      bottomSampleHex = bottomC.hex;

      // If top and bottom are very similar, use cardBgColor fallback if sample is too dark/out of bounds
      if (topC.r < 15 && topC.g < 15 && topC.b < 15 && options.cardBgColor) {
        topSampleHex = options.cardBgColor;
        bottomSampleHex = options.cardBgColor;
      }
    } catch {
      // fallback to user card color
      topSampleHex = options.cardBgColor;
      bottomSampleHex = options.cardBgColor;
    }
  }

  // Draw background patch with subtle rounded corners and feathered edge
  const cornerRadius = Math.min(16, patchH * 0.25);
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(patchX, patchY, patchW, patchH, cornerRadius);
  } else {
    ctx.rect(patchX, patchY, patchW, patchH);
  }

  if (options.blendMode === 'auto_sample' || options.blendMode === 'linear_gradient') {
    const gradient = ctx.createLinearGradient(patchX, patchY, patchX, patchY + patchH);
    gradient.addColorStop(0, topSampleHex);
    gradient.addColorStop(1, bottomSampleHex);
    ctx.fillStyle = gradient;
  } else {
    ctx.fillStyle = options.cardBgColor;
  }

  // Feather blur
  if (options.featherRadius > 0) {
    ctx.filter = `blur(${options.featherRadius}px)`;
  }
  ctx.fill();
  ctx.restore();

  // 4. Word Text Transformation
  let displayText = (options.replacementWord || '').trim();

  // Apply Homoglyph if enabled
  if (options.useHomoglyph && displayText) {
    displayText = escapeCensoredWord(displayText, 'cyrillic');
  }

  // Text Transform Casing
  if (options.textTransform === 'uppercase') {
    displayText = displayText.toUpperCase();
  } else if (options.textTransform === 'lowercase') {
    displayText = displayText.toLowerCase();
  } else if (options.textTransform === 'capitalize') {
    displayText = displayText.replace(/\b\w/g, (l) => l.toUpperCase());
  }

  // 5. Render New Word on Canvas
  if (displayText) {
    ctx.save();

    // Center coordinates with manual offset controls
    const centerX = xmin + boxW / 2 + options.xOffset;
    const centerY = ymin + boxH / 2 + options.yOffset;

    // Calculate optimal font size
    let fontSize = Math.max(14, boxH * 0.78 * options.fontSizeScale);
    const fontFamilies = [
      'Nunito',
      'Fredoka',
      'Quicksand',
      'PingFang SC',
      'Microsoft YaHei',
      'Arial Rounded MT Bold',
      '-apple-system',
      'sans-serif',
    ].join(', ');

    const fontWeight = options.fontWeight || 'bold';
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamilies}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Constrain width if replacement word is longer than original bounding box
    let measuredWidth = ctx.measureText(displayText).width;
    const maxAllowedWidth = Math.max(boxW * 1.35, width * 0.65);
    if (measuredWidth > maxAllowedWidth) {
      const scaleDown = maxAllowedWidth / measuredWidth;
      fontSize = Math.max(12, Math.round(fontSize * scaleDown));
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamilies}`;
      measuredWidth = ctx.measureText(displayText).width;
    }

    // Shadow
    if (options.hasShadow) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = Math.max(2, fontSize * 0.08);
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = Math.max(1, fontSize * 0.05);
    }

    // Text Outline / Stroke
    if (options.hasOutline) {
      ctx.strokeStyle = options.strokeColor || '#000000';
      ctx.lineWidth = Math.max(2, fontSize * 0.08);
      ctx.lineJoin = 'round';
      ctx.strokeText(displayText, centerX, centerY);
    }

    // Fill Text
    ctx.fillStyle = options.textColor;
    ctx.fillText(displayText, centerX, centerY);

    ctx.restore();
  }

  const dataUrl = canvas.toDataURL('image/png', 0.95);
  return {
    canvas,
    dataUrl,
    wordCoords: {
      x: patchX,
      y: patchY,
      width: patchW,
      height: patchH,
    },
  };
}

/**
 * Downloads canvas / dataUrl as an image file
 */
export function downloadEditedImage(dataUrl: string, filename: string = 'weplay_spy_edited.png') {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Copies the canvas image directly into system clipboard
 */
export async function copyCanvasImageToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        resolve(false);
        return;
      }
      try {
        if (navigator.clipboard && navigator.clipboard.write) {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          resolve(true);
        } else {
          resolve(false);
        }
      } catch {
        resolve(false);
      }
    }, 'image/png');
  });
}
