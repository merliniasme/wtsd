import React, { useState } from 'react';
import { Word, RELATION_TAGS, TAG_METADATA, SyncStatus } from '../types';
import { clearAllWords } from '../utils/storage';
import { calculateRelationsByTag, extractAllPairs } from '../utils/wordGraph';
import { GoogleDriveSyncSection } from './GoogleDriveSyncSection';
import { DriveFileInfo } from '../utils/googleDrive';
import { User } from 'firebase/auth';
import {
  Trash2,
  AlertTriangle,
  Database,
  Cloud,
} from 'lucide-react';

interface SettingsViewProps {
  words: Word[];
  onUpdateWords: (newWords: Word[]) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  user: User | null;
  syncStatus: SyncStatus;
  lastSyncedAt: Date | null;
  cloudFileInfo: DriveFileInfo | null;
  cloudWordCount: number | null;
  isSigningIn: boolean;
  isOperating: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onSyncNow: () => void;
  onClearCloudDatabase: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  words,
  onUpdateWords,
  onToast,
  user,
  syncStatus,
  lastSyncedAt,
  cloudFileInfo,
  cloudWordCount,
  isSigningIn,
  isOperating,
  onSignIn,
  onSignOut,
  onSyncNow,
  onClearCloudDatabase,
}) => {
  // State for Delete Confirmation Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  const allPairs = extractAllPairs(words);
  const relationsByTag = calculateRelationsByTag(words);

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
        lastSyncedAt={lastSyncedAt}
        cloudFileInfo={cloudFileInfo}
        cloudWordCount={cloudWordCount}
        isSigningIn={isSigningIn}
        isOperating={isOperating}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
        onSyncNow={onSyncNow}
      />

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
