import React, { useState, useEffect } from 'react';
import {
  Word,
  RELATION_TAGS,
  TAG_METADATA,
  SyncStatus,
  GeminiModelId,
  GeminiClueStyle,
} from '../types';
import { clearAllWords } from '../utils/storage';
import { calculateRelationsByTag, extractAllPairs } from '../utils/wordGraph';
import { AdminDashboard } from './AdminDashboard';

import { UserAccount } from '../utils/api';
import {
  getCustomCluePrompt,
  saveCustomCluePrompt,
  resetCustomCluePrompt,
  getCustomGeminiApiKey,
  saveCustomGeminiApiKey,
  clearCustomGeminiApiKey,
  hasCustomGeminiApiKey,
  getSelectedGeminiModel,
  saveSelectedGeminiModel,
  getGeminiTemperature,
  saveGeminiTemperature,
  getGeminiClueStyle,
  saveGeminiClueStyle,
  getGeminiClueCount,
  saveGeminiClueCount,
  GEMINI_SUPPORTED_MODELS,
  GEMINI_STYLE_PRESETS,
  testAiHealthApi,
  fetchServerAiConfig,
  ServerAiConfig,
} from '../utils/aiClue';
import {
  Trash2,
  AlertTriangle,
  Database,
  Cloud,
  FileUp,
  ArrowRight,
  VenetianMask,
  Sparkles,
  ScanSearch,
  Save,
  Check,
  RefreshCw,
  Cpu,
  Key,
  Eye,
  EyeOff,
  Sliders,
  ExternalLink,
  Zap,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface SettingsViewProps {
  words: Word[];
  onUpdateWords: (newWords: Word[]) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  isOperating: boolean;
  onSignOut: () => void;
  onSyncNow: () => void;
  onOpenRawImport: () => void;
  onOpenAntiCensor?: (tab?: 'analyze' | 'escape') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  words,
  onUpdateWords,
  onToast,
  syncStatus,
  lastSyncedAt,
  isOperating,
  onSignOut,
  onSyncNow,
  onOpenRawImport,
  onOpenAntiCensor,
}) => {
  // State for Delete Confirmation Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  // State for Customizable AI Clue Prompt & Gemini Configuration
  const [customApiKey, setCustomApiKey] = useState<string>(() => getCustomGeminiApiKey());
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [isKeySaved, setIsKeySaved] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModelId>(() => getSelectedGeminiModel());
  const [temperature, setTemperature] = useState<number>(() => getGeminiTemperature());
  const [clueStyle, setClueStyle] = useState<GeminiClueStyle>(() => getGeminiClueStyle());
  const [clueCount, setClueCount] = useState<number>(() => getGeminiClueCount());
  const [cluePrompt, setCluePrompt] = useState<string>(() => getCustomCluePrompt());
  const [isPromptSaved, setIsPromptSaved] = useState<boolean>(false);
  const [isTestingAi, setIsTestingAi] = useState<boolean>(false);
  const [serverAiConfig, setServerAiConfig] = useState<ServerAiConfig | null>(null);
  const [aiTestResult, setAiTestResult] = useState<{
    status: 'ok' | 'error' | null;
    model?: string;
    message?: string;
    latencyMs?: number;
  }>({ status: null });

  useEffect(() => {
    fetchServerAiConfig().then((cfg) => setServerAiConfig(cfg));
  }, []);

  const allPairs = extractAllPairs(words);
  const relationsByTag = calculateRelationsByTag(words);

  const handleTestAi = async () => {
    setIsTestingAi(true);
    setAiTestResult({ status: null });
    try {
      const res = await testAiHealthApi(customApiKey.trim() || undefined, selectedModel);
      if (res.status === 'ok') {
        const keyType = res.isCustomKey ? 'Custom API Key' : 'Server Secret Key';
        setAiTestResult({
          status: 'ok',
          model: res.activeModel,
          latencyMs: res.latencyMs,
          message: `Connected successfully (${res.latencyMs !== undefined ? `${res.latencyMs}ms` : 'instant'} latency via ${keyType})`,
        });
        onToast(`AI connection confirmed on ${res.activeModel}!`, 'success');
      } else {
        setAiTestResult({
          status: 'error',
          message: res.message || 'AI test request failed',
        });
        onToast(res.message || 'AI test request failed', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAiTestResult({
        status: 'error',
        message: msg,
      });
      onToast(msg, 'error');
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleSaveApiKey = () => {
    saveCustomGeminiApiKey(customApiKey);
    setIsKeySaved(true);
    onToast(
      customApiKey.trim()
        ? 'Custom Gemini API Key saved securely!'
        : 'Key cleared. App will use server environment key.',
      'success'
    );
    setTimeout(() => setIsKeySaved(false), 2000);
  };

  const handleClearApiKey = () => {
    clearCustomGeminiApiKey();
    setCustomApiKey('');
    onToast('Custom API Key cleared. Reverted to server configuration.', 'info');
  };

  const handleModelChange = (m: GeminiModelId) => {
    setSelectedModel(m);
    saveSelectedGeminiModel(m);
    onToast(`AI Model set to ${m}`, 'info');
  };

  const handleTempChange = (t: number) => {
    setTemperature(t);
    saveGeminiTemperature(t);
  };

  const handleStyleChange = (s: GeminiClueStyle) => {
    setClueStyle(s);
    saveGeminiClueStyle(s);
  };

  const handleCountChange = (c: number) => {
    setClueCount(c);
    saveGeminiClueCount(c);
  };

  const handleSavePrompt = () => {
    saveCustomCluePrompt(cluePrompt);
    setIsPromptSaved(true);
    onToast('AI Clue prompt template saved successfully!', 'success');
    setTimeout(() => setIsPromptSaved(false), 2000);
  };

  const handleResetPrompt = () => {
    const def = resetCustomCluePrompt();
    setCluePrompt(def);
    onToast('AI Clue prompt reset to default template.', 'info');
  };

  const handleConfirmDeleteAll = () => {
    const cleared = clearAllWords();
    onUpdateWords(cleared);
    setIsDeleteModalOpen(false);
    setConfirmInput('');
    onToast('Active dictionary cleared locally.', 'info');
  };

  return (
    <div id="settings-view-container" className="space-y-4 animate-in fade-in duration-150">
      {/* Overview Stats Card */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-slate-100">Dictionary Overview</h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
              <Cloud className="w-3 h-3" />
              <span>Auto-Sync Active</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-2.5 text-center">
            <span className="text-[11px] text-slate-400">Total Words</span>
            <p className="text-base font-bold text-slate-100">{words.length}</p>
          </div>
          <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-2.5 text-center">
            <span className="text-[11px] text-slate-400">Total Pairs</span>
            <p className="text-base font-bold text-sky-400">{allPairs.length}</p>
          </div>
          <div className="col-span-2 bg-[#0F172A] border border-[#334155] rounded-lg p-2 flex flex-wrap items-center justify-center gap-1.5">
            {RELATION_TAGS.map((tag) => {
              const meta = TAG_METADATA[tag];
              const count = relationsByTag[tag] || 0;
              return (
                <div
                  key={tag}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300 border border-slate-700"
                >
                  <span className="font-mono text-[10px] text-sky-400">{meta.shortCode}:</span>
                  <span className="font-semibold">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Admin Dashboard & Backup Section */}
      <AdminDashboard onToast={onToast} words={words} onWordsRestored={onUpdateWords} />

      {/* Anti-Censor & Character Analyzer Feature Section */}
      {onOpenAntiCensor && (
        <section
          id="section-anticensor-settings"
          className="bg-[#1E293B] border border-amber-500/30 rounded-xl p-4 space-y-3 shadow-sm"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2 text-amber-400">
                <VenetianMask className="w-4 h-4" />
                <h3 className="text-sm font-semibold text-slate-100">
                  Anti-Sensor & Analisis Karakter Non-Latin (Homoglif & Unicode)
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Bedah kata asing atau mencurigakan untuk mendeteksi karakter non-Latin, huruf Sirilik Rusia/Yunani penyamar, dan karakter tak terlihat (Zero-Width). Anda juga dapat mengubah huruf biasa menjadi homoglif untuk lolos dari sensor chat dan filter kata otomatis.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
              <button
                id="btn-open-analyzer-settings"
                type="button"
                onClick={() => onOpenAntiCensor('analyze')}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold rounded-lg transition-transform active:scale-95 cursor-pointer shrink-0 shadow-sm"
              >
                <ScanSearch className="w-3.5 h-3.5" />
                <span>Analisis Non-Latin</span>
              </button>

              <button
                id="btn-open-anticensor-settings"
                type="button"
                onClick={() => onOpenAntiCensor('escape')}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-transform active:scale-95 cursor-pointer shrink-0 shadow-sm"
              >
                <VenetianMask className="w-3.5 h-3.5" />
                <span>Alat Anti-Sensor</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Gemini AI Configuration & Prompting Section */}
      <section
        id="section-gemini-ai-settings"
        className="bg-[#1E293B] border border-violet-500/30 rounded-xl p-4 sm:p-5 space-y-5 shadow-sm"
      >
        {/* Header and Quick Test Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-violet-500/20 text-violet-300 border border-violet-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-100">
                  Gemini AI & Prompting Configuration
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  {selectedModel}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Configure Gemini API access, active AI model, creativity temperature, clue strategies, and prompt templates.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-test-ai-status"
            onClick={handleTestAi}
            disabled={isTestingAi}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-violet-200 hover:text-white bg-violet-900/60 hover:bg-violet-800/80 border border-violet-600/60 rounded-lg transition-colors cursor-pointer disabled:opacity-50 shrink-0 shadow-sm"
            title="Test Gemini API connectivity, latency, and model response"
          >
            <Cpu className={`w-4 h-4 ${isTestingAi ? 'animate-spin' : ''}`} />
            <span>{isTestingAi ? 'Testing Connection...' : 'Test AI Connection'}</span>
          </button>
        </div>

        {/* AI Health Test Status Banner */}
        {aiTestResult.status && (
          <div
            id="ai-test-status-banner"
            className={`px-3.5 py-2.5 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border ${
              aiTestResult.status === 'ok'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {aiTestResult.status === 'ok' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-medium">{aiTestResult.message}</span>
            </div>
            {aiTestResult.latencyMs !== undefined && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900/70 text-slate-300 border border-slate-700 w-fit">
                Ping: {aiTestResult.latencyMs}ms
              </span>
            )}
          </div>
        )}

        {/* 1. API Key Configuration */}
        <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-200">
              <Key className="w-4 h-4 text-violet-400" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Gemini API Key
              </h4>
            </div>
            <div className="flex items-center gap-2">
              {hasCustomGeminiApiKey() ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" />
                  Custom Key Active
                </span>
              ) : serverAiConfig?.serverKeyConfigured ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-300 bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3" />
                  Server Environment Key Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                  No Key Saved
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Provide your personal Gemini API Key. Your key is stored strictly in your browser&apos;s local storage and sent directly to the server proxy for authenticated clue generation requests.
          </p>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                id="input-gemini-api-key"
                type={showApiKey ? 'text' : 'password'}
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder="AIzaSy... (Paste your Gemini API key)"
                className="w-full bg-[#1E293B] border border-[#334155] focus:border-violet-500 rounded-lg pl-3 pr-9 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:ring-1 focus:ring-violet-500 transition-colors"
              />
              <button
                type="button"
                id="btn-toggle-key-visibility"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                title={showApiKey ? 'Hide Key' : 'Show Key'}
              >
                {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-save-gemini-key"
                onClick={handleSaveApiKey}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer shrink-0"
              >
                {isKeySaved ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Key</span>
                  </>
                )}
              </button>

              {customApiKey && (
                <button
                  type="button"
                  id="btn-clear-gemini-key"
                  onClick={handleClearApiKey}
                  className="px-2.5 py-2 text-xs text-slate-400 hover:text-rose-300 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-800/60 rounded-lg transition-colors cursor-pointer shrink-0"
                  title="Clear custom key and revert to server environment default"
                >
                  Clear Key
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span>Need a Gemini API key?</span>
            <a
              href="https://aistudio.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-violet-400 hover:text-violet-300 underline underline-offset-2"
            >
              <span>Get a free key from Google AI Studio</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* 2. Model Selection */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200">
              <Cpu className="w-4 h-4 text-violet-400" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Gemini Model
              </h4>
            </div>
            <span className="text-[11px] text-slate-400">
              Select model for strategic clue generation
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {GEMINI_SUPPORTED_MODELS.map((m) => {
              const isSelected = selectedModel === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  id={`model-option-${m.id}`}
                  onClick={() => handleModelChange(m.id)}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-violet-950/40 border-violet-500 text-slate-100 ring-1 ring-violet-500/50'
                      : 'bg-[#0F172A] border-[#334155] text-slate-300 hover:border-slate-600 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-xs font-semibold">{m.name}</span>
                    {m.badge && (
                      <span
                        className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${
                          isSelected
                            ? 'bg-violet-500/30 text-violet-200 border-violet-500/40'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {m.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {m.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Prompting Strategy & Creativity Parameters */}
        <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-3.5 sm:p-4 space-y-4">
          <div className="flex items-center gap-2 text-slate-200">
            <Sliders className="w-4 h-4 text-violet-400" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Prompting Strategy & Creativity
            </h4>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">
                Creativity & Variance (Temperature)
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-violet-300 font-semibold">
                  {temperature.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700">
                  {temperature <= 0.4
                    ? 'Guarded & Strict'
                    : temperature <= 0.8
                    ? 'Balanced & Tactical'
                    : 'Highly Creative & Abstract'}
                </span>
              </div>
            </div>
            <input
              id="slider-gemini-temperature"
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={temperature}
              onChange={(e) => handleTempChange(parseFloat(e.target.value))}
              className="w-full accent-violet-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0.1 (Strict & Guarded)</span>
              <span>0.75 (Recommended Default)</span>
              <span>1.0 (Abstract & Metaphorical)</span>
            </div>
          </div>

          {/* Clue Style Preset */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-xs text-slate-300 font-medium block">
              Default Strategic Clue Style
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {GEMINI_STYLE_PRESETS.map((preset) => {
                const isSelected = clueStyle === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleStyleChange(preset.id)}
                    className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-violet-950/40 border-violet-500 text-slate-100 ring-1 ring-violet-500/40'
                        : 'bg-[#1E293B] border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold mb-0.5">
                      <span>{preset.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-violet-400" />}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clue Count Selection */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
            <span className="text-slate-300 font-medium">
              Clues Generated per Request
            </span>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 5].map((cnt) => (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => handleCountChange(cnt)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                    clueCount === cnt
                      ? 'bg-violet-600 text-white border-violet-500 shadow-sm'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {cnt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Prompt Template Customization */}
        <div className="space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-200">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Custom Prompt Template
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-reset-ai-prompt"
                onClick={handleResetPrompt}
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer px-2 py-1 rounded hover:bg-slate-800"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Default</span>
              </button>
              <button
                type="button"
                id="btn-save-ai-prompt"
                onClick={handleSavePrompt}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                {isPromptSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Template</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Customize the system instruction and context sent to Gemini. Use dynamic variables to inject word details, related words, chosen style, and clue counts.
          </p>

          <div className="relative">
            <textarea
              id="textarea-custom-clue-prompt"
              value={cluePrompt}
              onChange={(e) => {
                setCluePrompt(e.target.value);
                setIsPromptSaved(false);
              }}
              rows={7}
              className="w-full bg-[#0F172A] border border-[#334155] focus:border-violet-500 rounded-lg p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y transition-colors"
              placeholder="Enter custom prompt template..."
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span>Insert variable:</span>
              {[
                { tag: '{word}', title: 'Target secret word' },
                { tag: '{related}', title: 'Opposing or linked dictionary words' },
                { tag: '{style}', title: 'Selected strategic clue style' },
                { tag: '{count}', title: 'Desired clue count' },
              ].map(({ tag, title }) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setCluePrompt((prev) => prev + ` ${tag}`)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 hover:bg-slate-700 font-mono cursor-pointer border border-slate-700 transition-colors"
                  title={title}
                >
                  {tag}
                </button>
              ))}
            </div>
            <span>Length: {cluePrompt.length} chars</span>
          </div>
        </div>
      </section>

      {/* Raw Plain Text Import Section */}
      <section
        id="section-raw-import-settings"
        className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 space-y-3 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sky-400">
              <FileUp className="w-4 h-4" />
              <h3 className="text-sm font-semibold text-slate-100">Raw Text Dictionary Import</h3>
            </div>
            <p className="text-xs text-slate-400">
              Import plain text files formatted as{' '}
              <code className="text-sky-300 font-mono text-[11px] bg-slate-900 px-1 py-0.5 rounded border border-slate-800">
                [Word1] # [Word2] & [Word3]
              </code>{' '}
              with automatic validation and Unknown tag assignment.
            </p>
          </div>

          <button
            id="btn-open-raw-import-settings"
            type="button"
            onClick={onOpenRawImport}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <FileUp className="w-3.5 h-3.5 text-sky-400" />
            <span>Open Raw Importer</span>
          </button>
        </div>
      </section>

      {/* Reset Active Dictionary (Danger Zone) */}
      <section
        id="section-danger-zone-delete"
        className="bg-[#1E293B] border border-rose-900/40 rounded-xl p-4 space-y-3 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-400">
            <Trash2 className="w-4 h-4" />
            <h3 className="text-sm font-semibold">Reset Active Dictionary</h3>
          </div>
          <button
            id="btn-open-delete-all-modal"
            onClick={() => {
              setConfirmInput('');
              setIsDeleteModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Reset Data</span>
          </button>
        </div>
      </section>

      {/* Confirmation Modal for Delete All */}
      {isDeleteModalOpen && (
        <div
          id="delete-all-modal-backdrop"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDeleteModalOpen(false);
          }}
        >
          <div
            id="delete-all-modal-card"
            className="bg-[#1E293B] w-full max-w-sm rounded-xl border border-rose-800/80 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-semibold text-sm text-slate-100">Reset Active Dictionary?</h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will clear your active dictionary ({words.length} words) and reset your Google Drive cloud database to 0 words.
            </p>

            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-medium text-slate-400">
                Type <strong className="text-rose-400 font-mono">CLEAR</strong> to confirm:
              </label>
              <input
                id="input-confirm-delete-all"
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="CLEAR"
                className="w-full px-3 py-2 bg-[#0F172A] text-rose-200 text-xs rounded-lg border border-rose-900 focus:outline-none focus:border-rose-500 font-mono placeholder:text-slate-600"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                id="btn-cancel-delete-all"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors cursor-pointer border border-[#334155]"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-all-submit"
                disabled={confirmInput.trim().toUpperCase() !== 'CLEAR'}
                onClick={handleConfirmDeleteAll}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs"
              >
                Reset Dictionary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
