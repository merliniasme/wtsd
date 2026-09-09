import React, { useState, useEffect, useMemo } from 'react';
import {
  Word,
  RELATION_TAGS,
  TAG_METADATA,
  COMPLETE_APP_FEATURES,
  GeminiModelId,
  GeminiClueStyle,
} from '../types';
import { extractAllPairs } from '../utils/wordGraph';
import {
  Settings,
  Trash2,
  AlertTriangle,
  RotateCcw,
  Save,
  Check,
  FileUp,
  Sparkles,
  Database,
  Users,
  Key,
  Eye,
  EyeOff,
  Cloud,
  RefreshCw,
  Sliders,
  HelpCircle,
  LogOut,
  Shield,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Smartphone,
} from 'lucide-react';
import { ApiClient } from '../utils/api';
import { AdminUserManagement } from './AdminUserManagement';
import { DatabaseBackupRestore } from './DatabaseBackupRestore';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  getCustomCluePrompt,
  saveCustomCluePrompt,
  DEFAULT_CLUE_PROMPT_TEMPLATE,
  getCustomGeminiApiKey,
  saveCustomGeminiApiKey,
  clearCustomGeminiApiKey,
  getSelectedGeminiModel,
  saveSelectedGeminiModel,
  getGeminiTemperature,
  saveGeminiTemperature,
  getGeminiClueStyle,
  saveGeminiClueStyle,
  GEMINI_SUPPORTED_MODELS,
  GEMINI_STYLE_PRESETS,
} from '../utils/aiClue';

interface SettingsViewProps {
  words: Word[];
  onUpdateWords: (words: Word[]) => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  syncStatus: any;
  lastSyncedAt: Date | null;
  isOperating: boolean;
  onSignOut: () => void;
  onSyncNow: () => void;
  onOpenRawImport: () => void;
}

type SettingsTab = 'users' | 'database' | 'ai' | 'app';

const InstallSettingsButton = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return (
      <div className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-lg flex items-center gap-1.5">
        <Check className="w-3.5 h-3.5" />
        <span>PWA Installed</span>
      </div>
    );
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 shadow-sm"
      >
        Install Offline App
      </button>
    );
  }

  if (isIOS) {
    return (
      <div className="space-y-1">
        <button
          onClick={() => setShowIOSGuide(!showIOSGuide)}
          className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
        >
          {showIOSGuide ? 'Hide iOS Instructions' : 'Install on iOS Safari'}
        </button>
        {showIOSGuide && (
          <p className="text-[11px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800">
            Tap the Share button in Safari, then select <strong>Add to Home Screen</strong>.
          </p>
        )}
      </div>
    );
  }

  return <div className="text-xs text-slate-500 italic">Running in web browser</div>;
};

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
}) => {
  const currentUser = ApiClient.user;
  const isAdmin = currentUser?.role === 'admin';

  // Permissions checks
  const canBackupRestore = ApiClient.hasPermission('canBackupRestore');
  const canRawImport = ApiClient.hasPermission('canRawImport');
  const canResetData = ApiClient.hasPermission('canResetData');
  const canUseAi = ApiClient.hasPermission('canUseAi');

  // Default tab selection: Admins see Users tab first; regular users see Database tab
  const [activeTab, setActiveTab] = useState<SettingsTab>(isAdmin ? 'users' : 'database');

  // Database metrics
  const allPairs = useMemo(() => extractAllPairs(words), [words]);

  // AI Configuration State
  const [apiKey, setApiKey] = useState(() => getCustomGeminiApiKey());
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModelId>(() => getSelectedGeminiModel());
  const [temperature, setTemperatureState] = useState<number>(() => getGeminiTemperature());
  const [clueStyle, setClueStyleState] = useState<GeminiClueStyle>(() => getGeminiClueStyle());
  const [cluePrompt, setCluePrompt] = useState(() => getCustomCluePrompt());
  const [isPromptSaved, setIsPromptSaved] = useState(true);

  // Danger zone reset modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Sync apiKey on mount
  useEffect(() => {
    setApiKey(getCustomGeminiApiKey());
    setCluePrompt(getCustomCluePrompt());
  }, []);

  const handleSaveApiKey = () => {
    saveCustomGeminiApiKey(apiKey);
    onToast('Gemini API Key saved successfully', 'success');
  };

  const handleClearApiKey = () => {
    clearCustomGeminiApiKey();
    setApiKey('');
    onToast('Gemini API Key cleared from local storage', 'info');
  };

  const handleModelChange = (modelId: GeminiModelId) => {
    setSelectedModel(modelId);
    saveSelectedGeminiModel(modelId);
    onToast(`AI Model set to ${modelId}`, 'info');
  };

  const handleTemperatureChange = (val: number) => {
    setTemperatureState(val);
    saveGeminiTemperature(val);
  };

  const handleStyleChange = (style: GeminiClueStyle) => {
    setClueStyleState(style);
    saveGeminiClueStyle(style);
  };

  const handleSavePrompt = () => {
    saveCustomCluePrompt(cluePrompt);
    setIsPromptSaved(true);
    onToast('AI Clue System Prompt Template saved', 'success');
    setTimeout(() => setIsPromptSaved(false), 2500);
  };

  const handleResetPrompt = () => {
    setCluePrompt(DEFAULT_CLUE_PROMPT_TEMPLATE);
    saveCustomCluePrompt(DEFAULT_CLUE_PROMPT_TEMPLATE);
    setIsPromptSaved(true);
    onToast('AI Prompt Template reset to default', 'info');
    setTimeout(() => setIsPromptSaved(false), 2500);
  };

  const handleConfirmDeleteAll = async () => {
    if (confirmInput.trim().toUpperCase() !== 'CLEAR') return;

    if (!canResetData) {
      onToast('You do not have permission to wipe the database', 'error');
      return;
    }

    try {
      setIsResetting(true);
      await ApiClient.saveWords([]);
      onUpdateWords([]);
      onToast('Database cleared successfully from Firestore cloud', 'success');
      setIsDeleteModalOpen(false);
      setConfirmInput('');
    } catch (err: any) {
      onToast(`Failed to reset data: ${err.message}`, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-200">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#334155]/60">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-sky-400" />
            <span>Settings & Administration</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure system settings, cloud synchronization, AI parameters, and user permissions.
          </p>
        </div>

        {/* Current Account Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-[#1E293B] px-3 py-1.5 rounded-lg border border-[#334155]">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              isAdmin ? 'bg-rose-400 animate-pulse' : 'bg-sky-400'
            }`}
          />
          <span className="text-xs text-slate-200 font-medium">{currentUser?.username || 'Guest'}</span>
          <span
            className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
              isAdmin
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
            }`}
          >
            {isAdmin ? 'Master Admin' : 'Restricted User'}
          </span>
        </div>
      </div>

      {/* Settings Navigation Tabs (Prioritized and Ordered) */}
      <div
        id="settings-tab-bar"
        className="flex items-center gap-1.5 p-1 bg-[#0F172A] border border-[#334155] rounded-xl overflow-x-auto"
      >
        {isAdmin && (
          <button
            id="tab-btn-users"
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <Users className="w-4 h-4 text-amber-400" />
            <span>Users & Roles</span>
            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-500/30 text-amber-200 rounded-full">
              Admin
            </span>
          </button>
        )}

        <button
          id="tab-btn-database"
          type="button"
          onClick={() => setActiveTab('database')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'database'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
          }`}
        >
          <Database className="w-4 h-4 text-sky-400" />
          <span>Database & Backup</span>
        </button>

        <button
          id="tab-btn-ai"
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'ai'
              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
          }`}
        >
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span>AI Intelligence</span>
          {!canUseAi && !isAdmin && <Lock className="w-3 h-3 text-slate-500" />}
        </button>

        <button
          id="tab-btn-app"
          type="button"
          onClick={() => setActiveTab('app')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'app'
              ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-xs'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
          }`}
        >
          <Smartphone className="w-4 h-4 text-slate-400" />
          <span>App & Permissions</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: USERS & ROLES (Admin Exclusive) */}
      {/* ========================================================================= */}
      {activeTab === 'users' && isAdmin && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <AdminUserManagement onToast={onToast} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DATABASE & BACKUP */}
      {/* ========================================================================= */}
      {activeTab === 'database' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Cloud Synchronization Status Card */}
          <section className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 sm:p-5 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-100">Cloud Database Synchronization</h4>
                  <p className="text-xs text-slate-400">
                    Real-time persistence powered by Firebase Firestore.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onSyncNow}
                disabled={isOperating}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isOperating ? 'animate-spin' : ''}`} />
                <span>{isOperating ? 'Syncing...' : 'Sync Cloud Now'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
              <div className="bg-[#0F172A] p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Sync Engine Status</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Connected & Active
                </span>
              </div>
              <div className="bg-[#0F172A] p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">Last Synced</span>
                <span className="text-slate-200 font-mono">
                  {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : 'Current session'}
                </span>
              </div>
            </div>
          </section>

          {/* Database Backup and Restore (Admin Only, or Delegated Permission) */}
          <DatabaseBackupRestore
            words={words}
            onRestoreBackup={onUpdateWords}
            onToast={onToast}
          />

          {/* Database Overview & Distribution */}
          <section className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <div className="flex items-center gap-2 text-emerald-400">
                <Database className="w-4 h-4" />
                <h4 className="text-sm font-semibold text-slate-100">Dictionary Inventory & Metrics</h4>
              </div>
              <span className="text-xs text-slate-400 font-mono">{words.length} terms cataloged</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-3.5 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-sky-400">{words.length}</span>
                <span className="text-xs text-slate-400 font-medium mt-0.5">Total Words in Dictionary</span>
              </div>
              <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-3.5 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-emerald-400">{allPairs.length}</span>
                <span className="text-xs text-slate-400 font-medium mt-0.5">Established Paired Relations</span>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="pt-2">
              <h5 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                Pairs by Tag Category
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {RELATION_TAGS.map((tag) => {
                  const meta = TAG_METADATA[tag];
                  const count = allPairs.filter((p) => p.tag === tag).length;
                  return (
                    <div
                      key={tag}
                      className="bg-[#0F172A] border border-slate-800 rounded-lg p-2.5 flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <span className={`text-[10px] font-bold ${meta.badgeText} block`}>
                          {meta.shortCode}
                        </span>
                        <span className="text-xs text-slate-300 font-medium truncate block">
                          {meta.label}
                        </span>
                      </div>
                      <span className="text-base font-bold text-slate-100 font-mono">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Raw Text Dictionary Importer */}
          <section
            id="section-raw-import-settings"
            className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 sm:p-5 space-y-3 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sky-400">
                  <FileUp className="w-4 h-4" />
                  <h4 className="text-sm font-semibold text-slate-100">Raw Plain Text Dictionary Importer</h4>
                  {!canRawImport && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px]">
                      Locked
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                  Quickly bulk-import words from plain text files using syntax formatting{' '}
                  <code className="text-sky-300 font-mono text-[11px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    [Word1] # [Word2] & [Word3]
                  </code>
                  .
                </p>
              </div>

              {canRawImport ? (
                <button
                  id="btn-open-raw-import-settings"
                  type="button"
                  onClick={onOpenRawImport}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 shadow-sm"
                >
                  <FileUp className="w-3.5 h-3.5" />
                  <span>Open Raw Importer</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-slate-500 text-xs font-medium rounded-lg border border-slate-700">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Import Disabled</span>
                </div>
              )}
            </div>
          </section>

          {/* Danger Zone: Reset Active Dictionary */}
          <section
            id="section-danger-zone-delete"
            className="bg-[#1E293B] border border-rose-900/40 rounded-xl p-4 sm:p-5 space-y-3 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-rose-400">
                  <Trash2 className="w-4 h-4" />
                  <h4 className="text-sm font-semibold text-slate-100">Reset Active Dictionary (Danger Zone)</h4>
                  {!canResetData && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px]">
                      Admin Only
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Permanently clear all words and relationships in the Firestore cloud database.
                </p>
              </div>

              {canResetData ? (
                <button
                  id="btn-open-delete-all-modal"
                  type="button"
                  onClick={() => {
                    setConfirmInput('');
                    setIsDeleteModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Reset Data</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-slate-500 text-xs font-medium rounded-lg border border-slate-700">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Reset Restricted</span>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: AI INTELLIGENCE */}
      {/* ========================================================================= */}
      {activeTab === 'ai' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {!canUseAi ? (
            <div className="bg-[#1E293B] border border-violet-500/30 rounded-xl p-5 text-center space-y-2">
              <Lock className="w-6 h-6 text-violet-400 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-100">AI Intelligence Restricted</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Gemini AI Clue Assistant and Prompt Configuration are locked for your account. Please ask an administrator to grant the <strong>"Gemini AI Clue Assistant"</strong> permission to your account.
              </p>
            </div>
          ) : (
            <>
              {/* API Key Configuration */}
              <section
                id="section-gemini-api-key"
                className="bg-[#1E293B] border border-violet-500/30 rounded-xl p-4 sm:p-5 space-y-4 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-violet-500/20 text-violet-300 border border-violet-500/30">
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-100">Gemini API Key Authentication</h4>
                      <p className="text-xs text-slate-400">
                        Required for generating strategic undercover clues and tactical analysis.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {apiKey ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400" />
                        API Key Active
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-semibold">
                        Not Configured
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                    <span>Google Gemini API Secret Key</span>
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-[10px] text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                    >
                      {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showApiKey ? 'Hide' : 'Show'}</span>
                    </button>
                  </label>

                  <div className="flex items-center gap-2">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="flex-1 px-3 py-2 bg-[#0F172A] text-slate-100 text-xs rounded-lg border border-slate-700 focus:outline-none focus:border-violet-500 font-mono transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleSaveApiKey}
                      className="px-3.5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-sm shrink-0"
                    >
                      Save Key
                    </button>
                    {apiKey && (
                      <button
                        type="button"
                        onClick={handleClearApiKey}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors cursor-pointer shrink-0"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Stored securely in your local browser sandbox and never shared publicly.
                  </p>
                </div>
              </section>

              {/* Model & Reasoning Parameter Settings */}
              <section
                id="section-gemini-parameters"
                className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 sm:p-5 space-y-4 shadow-sm"
              >
                <div className="flex items-center gap-2 text-violet-400 pb-3 border-b border-slate-700/60">
                  <Sliders className="w-4 h-4" />
                  <h4 className="text-sm font-semibold text-slate-100">Model Selection & Strategy</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Model Choice */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Gemini AI Model</label>
                    <div className="space-y-2">
                      {GEMINI_SUPPORTED_MODELS.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleModelChange(m.id)}
                          className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                            selectedModel === m.id
                              ? 'bg-violet-500/15 border-violet-500/50 text-slate-100'
                              : 'bg-[#0F172A] border-slate-800 text-slate-400 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-200">{m.name}</div>
                            <div className="text-[10px] text-slate-400">{m.description}</div>
                          </div>
                          {m.badge && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-violet-300 border border-slate-700 font-mono shrink-0 ml-2">
                              {m.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Temperature & Strategy Style */}
                  <div className="space-y-4">
                    {/* Temperature Slider */}
                    <div className="space-y-1.5 bg-[#0F172A] p-3 rounded-lg border border-slate-800">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-300">Temperature</label>
                        <span className="text-xs font-mono text-violet-400 font-bold">{temperature}</span>
                      </div>
                      <input
                        type="range"
                        min={0.2}
                        max={1.2}
                        step={0.1}
                        value={temperature}
                        onChange={(e) => handleTemperatureChange(parseFloat(e.target.value))}
                        className="w-full accent-violet-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-slate-500">
                        <span>Strict & Subtle (0.2)</span>
                        <span>Balanced (0.7)</span>
                        <span>Creative & Deceptive (1.2)</span>
                      </div>
                    </div>

                    {/* Default Style Preset */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Default Tactical Style</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {GEMINI_STYLE_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleStyleChange(preset.id)}
                            className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                              clueStyle === preset.id
                                ? 'bg-violet-500/20 border-violet-500 text-violet-200'
                                : 'bg-[#0F172A] border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            <div className="text-[11px] font-semibold text-slate-200 truncate">
                              {preset.label}
                            </div>
                            <div className="text-[9px] text-slate-500 line-clamp-1">
                              {preset.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* System Instruction Prompt Template Editor */}
              <section
                id="section-gemini-prompt-template"
                className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 sm:p-5 space-y-4 shadow-sm"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-semibold text-slate-100">System Instruction Prompt Template</h4>
                    <p className="text-xs text-slate-400">
                      Format the strategic context and dynamic variables injected when generating word clues.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      id="btn-reset-ai-prompt"
                      onClick={handleResetPrompt}
                      className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-slate-800"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
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

                <div className="relative">
                  <textarea
                    id="textarea-custom-clue-prompt"
                    value={cluePrompt}
                    onChange={(e) => {
                      setCluePrompt(e.target.value);
                      setIsPromptSaved(false);
                    }}
                    rows={8}
                    className="w-full bg-[#0F172A] border border-slate-700 focus:border-violet-500 rounded-lg p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-violet-500 resize-y transition-colors"
                    placeholder="Enter system prompt instructions..."
                  />
                </div>

                {/* Variable injection helper buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span>Quick insert token:</span>
                    {[
                      { tag: '{word}', title: 'Target secret word' },
                      { tag: '{related}', title: 'Linked dictionary words' },
                      { tag: '{style}', title: 'Selected clue strategy' },
                      { tag: '{count}', title: 'Desired clue count' },
                    ].map(({ tag, title }) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setCluePrompt((prev) => prev + ` ${tag}`)}
                        className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 hover:bg-slate-700 font-mono cursor-pointer border border-slate-700 transition-colors"
                        title={title}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <span>{cluePrompt.length} characters</span>
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: APP & PERMISSIONS */}
      {/* ========================================================================= */}
      {activeTab === 'app' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* App Installation Card */}
          <section
            id="section-app-install"
            className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 sm:p-5 space-y-3 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sky-400">
                  <Smartphone className="w-4 h-4" />
                  <h4 className="text-sm font-semibold text-slate-100">Progressive Web App (PWA)</h4>
                </div>
                <p className="text-xs text-slate-400">
                  Install Who Is The Spy Manual to your home screen for quick offline-first access during gameplay sessions.
                </p>
              </div>
              <InstallSettingsButton />
            </div>
          </section>

          {/* Current Account & Effective Permissions Matrix */}
          <section
            id="section-my-effective-permissions"
            className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 sm:p-5 space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
              <div className="flex items-center gap-2 text-slate-200">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-semibold">Account Role & Effective Features</h4>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {currentUser?.username || 'Guest'}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Below is the comprehensive feature entitlement list for your account. Feature permissions are managed by administrators via the{' '}
              <strong className="text-slate-300">Users & Roles</strong> panel.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {COMPLETE_APP_FEATURES.map((feature) => {
                const isAllowed = ApiClient.hasPermission(feature.key);
                return (
                  <div
                    key={feature.key}
                    className={`flex items-start justify-between p-3 rounded-lg border transition-colors ${
                      isAllowed
                        ? 'bg-[#0F172A] border-slate-800'
                        : 'bg-[#0F172A]/40 border-slate-900 opacity-65'
                    }`}
                  >
                    <div className="min-w-0 pr-3 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-200">
                          {feature.name}
                        </span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {feature.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight">
                        {feature.description}
                      </p>
                    </div>

                    <div className="shrink-0">
                      {isAllowed ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Unlocked</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700">
                          <Lock className="w-3 h-3 text-slate-500" />
                          <span>Restricted</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Sign Out Card */}
          <section
            id="section-signout"
            className="bg-[#1E293B] border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
          >
            <div className="space-y-0.5">
              <h4 className="text-xs font-semibold text-slate-200">Session Management</h4>
              <p className="text-xs text-slate-400">
                Sign out of this device. You will need to re-authenticate with your nickname and password.
              </p>
            </div>

            <button
              type="button"
              id="btn-sign-out"
              onClick={onSignOut}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-rose-200 border border-slate-700 hover:border-rose-900/40 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Sign Out of Account</span>
            </button>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION MODAL: RESET ACTIVE DICTIONARY */}
      {/* ========================================================================= */}
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
              This action will clear all <strong className="text-white">{words.length} words</strong> and relationships from your active Firestore database collection.
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
                disabled={isResetting}
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors cursor-pointer border border-[#334155]"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-all-submit"
                disabled={confirmInput.trim().toUpperCase() !== 'CLEAR' || isResetting}
                onClick={handleConfirmDeleteAll}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs"
              >
                {isResetting ? 'Resetting...' : 'Reset Dictionary'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
