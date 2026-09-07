import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const DB_PATH = path.join(process.cwd(), 'database.json');
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-1234';

// Initialize DB if not exists
async function initDb() {
  try {
    await fs.access(DB_PATH);
  } catch {
    const adminPassword = await bcrypt.hash('admin', 10);
    const initialDb = {
      users: [
        {
          id: '1',
          username: 'admin',
          password: adminPassword,
          role: 'admin',
          permissions: { canEditDictionary: true, canBackupRestore: true }
        }
      ],
      words: []
    };
    await fs.writeFile(DB_PATH, JSON.stringify(initialDb, null, 2), 'utf-8');
  }
}

async function readDb() {
  const data = await fs.readFile(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

async function writeDb(data: any) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

initDb();

// Middleware
const requireAuth = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin required' });
  next();
};

const requireDictPerms = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin' && !req.user?.permissions?.canEditDictionary) {
    return res.status(403).json({ error: 'Permission denied to edit dictionary' });
  }
  next();
};

const requireBackupPerms = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin' && !req.user?.permissions?.canBackupRestore) {
    return res.status(403).json({ error: 'Permission denied to backup/restore' });
  }
  next();
};

// --- AUTH API ---
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const db = await readDb();
  const user = db.users.find((u: any) => u.username === username);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });
  
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ error: 'Invalid username or password' });
  
  const safeUser = { id: user.id, username: user.username, role: user.role, permissions: user.permissions };
  const token = jwt.sign(safeUser, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: safeUser });
});

// --- ADMIN USERS API ---
app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  const db = await readDb();
  const users = db.users.map((u: any) => ({ id: u.id, username: u.username, role: u.role, permissions: u.permissions }));
  res.json(users);
});

app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  const { username, password, permissions } = req.body;
  const db = await readDb();
  if (db.users.find((u: any) => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: Date.now().toString(),
    username,
    password: hashedPassword,
    role: 'user',
    permissions: permissions || { canEditDictionary: false, canBackupRestore: false }
  };
  db.users.push(newUser);
  await writeDb(db);
  res.json({ success: true });
});

app.put('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { permissions, password } = req.body;
  const db = await readDb();
  const user = db.users.find((u: any) => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (permissions) user.permissions = permissions;
  if (password) user.password = await bcrypt.hash(password, 10);
  await writeDb(db);
  res.json({ success: true });
});

app.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const db = await readDb();
  db.users = db.users.filter((u: any) => u.id !== req.params.id);
  await writeDb(db);
  res.json({ success: true });
});

// --- DICTIONARY API ---
app.get('/api/words', requireAuth, async (req, res) => {
  const db = await readDb();
  res.json(db.words || []);
});

app.post('/api/words', requireAuth, requireDictPerms, async (req, res) => {
  const { words } = req.body;
  const db = await readDb();
  db.words = words;
  await writeDb(db);
  res.json({ success: true });
});

// --- BACKUP & RESTORE API ---
app.get('/api/backup', requireAuth, requireBackupPerms, async (req, res) => {
  const db = await readDb();
  res.json(db);
});

app.post('/api/restore', requireAuth, requireBackupPerms, async (req, res) => {
  const { db } = req.body;
  if (!db || !db.users || !db.words) return res.status(400).json({ error: 'Invalid backup format' });
  await writeDb(db);
  res.json({ success: true });
});

// --- GEMINI & OTHER APIS (unchanged) ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

let defaultAiClient: GoogleGenAI | null = null;
function getDefaultGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!defaultAiClient) {
    defaultAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
  }
  return defaultAiClient;
}

function resolveGenAI(clientKey?: string): { ai: GoogleGenAI | null; isCustomKey: boolean } {
  const trimmed = typeof clientKey === 'string' ? clientKey.trim() : '';
  if (trimmed) {
    return {
      ai: new GoogleGenAI({
        apiKey: trimmed,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      }),
      isCustomKey: true,
    };
  }
  return { ai: getDefaultGenAI(), isCustomKey: false };
}

function parseGeminiErrorMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) return parsed.error.message;
  } catch {}
  return raw;
}

app.get('/api/ai/config', (_req, res) => {
  res.json({
    serverKeyConfigured: Boolean(process.env.GEMINI_API_KEY),
    defaultModel: 'gemini-3.8-flash',
    supportedModels: [
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', badge: 'Recommended', description: 'Optimal balance of reasoning, nuance & speed for word clues.' },
      { id: 'gemini-flash-latest', name: 'Gemini Flash (Latest)', badge: 'General', description: 'Auto-updating latest Flash release for fast text generation.' },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-8B', badge: 'Fastest', description: 'Extremely fast and lightweight model for simple extraction tasks.' },
      { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Preview)', badge: 'Complex Reasoning', description: 'Advanced model for deep reasoning and complex relationships.' }
    ]
  });
});

app.post('/api/ai/test', async (req, res) => {
  try {
    const clientKey = req.body.apiKey;
    const modelId = req.body.model || 'gemini-3.8-flash';
    const { ai, isCustomKey } = resolveGenAI(clientKey);
    if (!ai) return res.status(401).json({ error: 'No Gemini API key provided.' });

    const start = Date.now();
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ role: 'user', parts: [{ text: 'Respond with the exact word "SUCCESS" and nothing else.' }] }],
      config: { temperature: 0.1, maxOutputTokens: 5 },
    });
    
    if (response.text?.trim().toUpperCase().includes('SUCCESS')) {
      return res.json({ status: 'ok', isCustomKey, activeModel: modelId, latencyMs: Date.now() - start });
    } else {
      return res.status(500).json({ error: 'AI responded but did not return the expected success string.' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: parseGeminiErrorMessage(error.message || String(error)) });
  }
});

app.post('/api/ai/clue', async (req, res) => {
  try {
    const clientKey = req.body.apiKey;
    const modelId = req.body.model || 'gemini-3.8-flash';
    const { ai } = resolveGenAI(clientKey);
    if (!ai) return res.status(401).json({ error: 'No Gemini API key provided.' });

    const response = await ai.models.generateContent({
      model: modelId,
      contents: [{ role: 'user', parts: [{ text: req.body.prompt }] }],
      config: { temperature: req.body.temperature ?? 0.8 },
    });
    return res.json({ response: response.text });
  } catch (error: any) {
    return res.status(500).json({ error: parseGeminiErrorMessage(error.message || String(error)) });
  }
});

// Vite middleware & Static Serve
if (process.env.NODE_ENV !== 'production') {
  createViteServer({ server: { middlewareMode: true }, appType: 'spa' }).then(vite => {
    app.use(vite.middlewares);
    app.listen(PORT, '0.0.0.0', () => console.log(`Dev server running on port ${PORT}`));
  });
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  app.listen(PORT, '0.0.0.0', () => console.log(`Prod server running on port ${PORT}`));
}
