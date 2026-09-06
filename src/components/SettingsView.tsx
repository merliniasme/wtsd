import React, { useState } from 'react';
import { Word, RELATION_TAGS, TAG_METADATA, SyncStatus } from '../types';
import { clearAllWords } from '../utils/storage';
import { calculateRelationsByTag, extractAllPairs } from '../utils/wordGraph';
import { GoogleDriveSyncSection } from './GoogleDriveSyncSection';
import { DriveFileInfo } from '../utils/googleDrive';
import { User } from 'firebase/auth';
import {
  getCustomCluePrompt,
  saveCustomCluePrompt,
  resetCustomCluePrompt,
  testAiHealthApi,
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
} from 'lucide-react';

interface SettingsViewProps {
  words: Word[];
  onUpdateWords: (newWords: Word[]) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  user: User | null;
  syncStatus: SyncStatus;
  isTokenExpired?: boolean;
  lastSyncedAt: Date | null;
  cloudFileInfo: DriveFileInfo | null;
  cloudWordCount: number | null;
  isSigningIn: boolean;
  isOperating: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onSyncNow: () => void;
  onClearCloudDatabase: () => void;
  onOpenRawImport: () => void;
  onOpenAntiCensor?: (tab?: 'analyze' | 'escape') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  words,
  onUpdateWords,
  onToast,
  user,
  syncStatus,
  isTokenExpired,
  lastSyncedAt,
  cloudFileInfo,
  cloudWordCount,
  isSigningIn,
  isOperating,
  onSignIn,
  onSignOut,
  onSyncNow,
  onClearCloudDatabase,
  onOpenRawImport,
  onOpenAntiCensor,
}) => {
  // State for Delete Confirmation Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  // State for Customizable AI Clue Prompt
  const [cluePrompt, setCluePrompt] = useState<string>(() => getCustomCluePrompt());
  const [isPromptSaved, setIsPromptSaved] = useState<boolean>(false);
  const [isTestingAi, setIsTestingAi] = useState<boolean>(false);
  const [aiTestResult, setAiTestResult] = useState<{
    status: 'ok' | 'error' | null;
    model?: string;
    message?: string;
  }>({ status: null });

  const allPairs = extractAllPairs(words);
  const relationsByTag = calculateRelationsByTag(words);

  const handleTestAi = async () => {
    setIsTestingAi(true);
    setAiTestResult({ status: null });
    try {
      const res = await testAiHealthApi();
      if (res.status === 'ok') {
        setAiTestResult({
          status: 'ok',
          model: res.activeModel,
          message: `Connected! Active model: ${res.activeModel}`,
        });
        onToast(`AI connection confirmed (${res.activeModel})!`, 'success');
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

  // Handle Clear Database
  const handleConfirmDeleteAll = () => {
    onClearCloudDatabase();
    const cleared = clearAllWords();
    onUpdateWords(cleared);
    setIsDeleteModalOpen(false);
    setConfirmInput('');
    onToast('Active dictionary cleared.', 'info');
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
            {user ? (
              <span className="flex items-center gap-1 text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
                <Cloud className="w-3 h-3" />
                <span>Auto-Sync Active</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-400 font-mono bg-slate-900 border border-slate-700 px-2 py-0.5 rounded">
                <Cloud className="w-3 h-3 text-slate-500" />
                <span>Offline</span>
              </span>
            )}
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

      {/* Google Drive Primary Store & Auto-Sync Section */}
      <GoogleDriveSyncSection
        user={user}
        syncStatus={syncStatus}
        isTokenExpired={isTokenExpired}
        lastSyncedAt={lastSyncedAt}
        cloudFileInfo={cloudFileInfo}
        cloudWordCount={cloudWordCount}
        isSigningIn={isSigningIn}
        isOperating={isOperating}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
        onSyncNow={onSyncNow}
      />

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

      {/* AI Clue Prompt Template Configuration Section */}
      <section
        id="section-ai-clue-prompt-settings"
        className="bg-[#1E293B] border border-violet-500/30 rounded-xl p-4 space-y-3.5 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-violet-400">
            <Sparkles className="w-4 h-4" />
            <h3 className="text-sm font-semibold text-slate-100">
              AI Clue Prompt Template
            </h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
              Customizable
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="btn-test-ai-status"
              onClick={handleTestAi}
              disabled={isTestingAi}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-violet-300 hover:text-white bg-violet-950/60 hover:bg-violet-900/80 border border-violet-700/60 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              title="Test Gemini API connectivity and model response"
            >
              <Cpu className={`w-3.5 h-3.5 ${isTestingAi ? 'animate-spin' : ''}`} />
              <span>{isTestingAi ? 'Testing...' : 'Test AI Connection'}</span>
            </button>
            <button
              type="button"
              id="btn-reset-ai-prompt"
              onClick={handleResetPrompt}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer px-2 py-1 rounded hover:bg-slate-800"
            >
              Reset to Default
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

        {/* AI Health Test Status Badge */}
        {aiTestResult.status && (
          <div
            id="ai-test-status-banner"
            className={`px-3 py-2 rounded-lg text-xs flex items-center justify-between border ${
              aiTestResult.status === 'ok'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {aiTestResult.status === 'ok' ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-medium">{aiTestResult.message}</span>
            </div>
            {aiTestResult.model && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/60">
                {aiTestResult.model}
              </span>
            )}
          </div>
        )}

        <p className="text-xs text-slate-400 leading-relaxed">
          Customize the prompt sent to Gemini AI when generating strategic game clues from the Words tab.
          Use <code className="text-sky-300 font-mono text-[11px] bg-slate-900 px-1 py-0.5 rounded border border-slate-800">{"{word}"}</code> to inject the target word and <code className="text-sky-300 font-mono text-[11px] bg-slate-900 px-1 py-0.5 rounded border border-slate-800">{"{related}"}</code> to inject opposing or linked words.
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
          <div className="flex items-center gap-2">
            <span>Available variables:</span>
            <button
              type="button"
              onClick={() => setCluePrompt((prev) => prev + ' {word}')}
              className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 hover:bg-slate-700 font-mono cursor-pointer border border-slate-700"
              title="Click to append {word}"
            >
              {"{word}"}
            </button>
            <button
              type="button"
              onClick={() => setCluePrompt((prev) => prev + ' {related}')}
              className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 hover:bg-slate-700 font-mono cursor-pointer border border-slate-700"
              title="Click to append {related}"
            >
              {"{related}"}
            </button>
          </div>
          <span>Length: {cluePrompt.length} chars</span>
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
