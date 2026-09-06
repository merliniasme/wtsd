import type { IncomingMessage, ServerResponse } from 'http';

export default function handler(
  _req: IncomingMessage,
  res: ServerResponse & { json?: (data: any) => void; status?: (code: number) => any }
) {
  const serverKeyConfigured = Boolean(process.env.GEMINI_API_KEY);
  const data = {
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
  };

  res.setHeader('Content-Type', 'application/json');
  res.statusCode = 200;
  res.end(JSON.stringify(data));
}
