import React, { useState, useEffect } from 'react';
import { Word } from '../types';
import {
  Trash2,
  AlertTriangle,
  RotateCcw,
  Save,
  Check,
  FileUp,
  Sparkles,
} from 'lucide-react';
import { ApiClient } from '../utils/api';
import { AdminDashboard } from './AdminDashboard';
import { getAiPromptTemplate, setAiPromptTemplate, DEFAULT_AI_PROMPT } from '../utils/aiClue';

interface SettingsViewProps {
  words: Word[];
  onUpdateWords: (words: Word[]) => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSyncedAt: Date | null;
  isOperating: boolean;
  onSignOut: () => void;
  onSyncNow: () => void;
  onOpenRawImport: () => void;
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
}) => {
  // State for Delete Confirmation Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  
  // State for AI Prompt configuration
  const [cluePrompt, setCluePrompt] = useState(DEFAULT_AI_PROMPT);
  const [isPromptSaved, setIsPromptSaved] = useState(true);

  // Load saved prompt on mount
  useEffect(() => {
    setCluePrompt(getAiPromptTemplate());
  }, []);

  const handleConfirmDeleteAll = async () => {
    if (confirmInput.trim().toUpperCase() !== 'CLEAR') return;
    
    try {
      await ApiClient.saveWords([]);
      onUpdateWords([]);
      onToast('Semua data berhasil dihapus dari cloud', 'success');
      setIsDeleteModalOpen(false);
    } catch (err: any) {
      console.error('Failed to clear words:', err);
      onToast(`Gagal menghapus data: ${err.message}`, 'error');
    }
  };

  const handleSavePrompt = () => {
    setAiPromptTemplate(cluePrompt);
    setIsPromptSaved(true);
    onToast('Template AI berhasil disimpan', 'success');
    setTimeout(() => setIsPromptSaved(false), 2000);
  };

  const handleResetPrompt = () => {
    setCluePrompt(DEFAULT_AI_PROMPT);
    setAiPromptTemplate(DEFAULT_AI_PROMPT);
    setIsPromptSaved(true);
    onToast('Template di-reset ke bawaan', 'info');
    setTimeout(() => setIsPromptSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      <div className="flex items-center justify-between pb-4 border-b border-[#334155]/60">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-400" />
          Settings & Data
        </h2>
      </div>

      {/* Admin Dashboard & Backup Section */}
      <AdminDashboard onToast={onToast} words={words} onWordsRestored={onUpdateWords} />

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
              <h3 className="text-sm font-semibold text-slate-100">Gemini AI Configuration</h3>
              <p className="text-[11px] text-slate-400">Manage clue generation prompts & settings</p>
            </div>
          </div>
        </div>

        {/* Prompt Editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label htmlFor="textarea-custom-clue-prompt" className="text-sm font-semibold text-slate-200">
              System Instructions Prompt
            </label>
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
