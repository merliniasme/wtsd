import React, { useState } from 'react';
import { Word, RELATION_TAGS, TAG_METADATA, SyncStatus } from '../types';
import { clearAllWords } from '../utils/storage';
import { calculateRelationsByTag, extractAllPairs } from '../utils/wordGraph';
import { GoogleDriveSyncSection } from './GoogleDriveSyncSection';
import { DriveFileInfo, BACKUP_FILE_NAME } from '../utils/googleDrive';
import { User } from 'firebase/auth';
import {
  Trash2,
  AlertTriangle,
  Database,
  Info,
  Cloud,
  ShieldCheck,
  FileCheck2,
  Lock,
  Sparkles,
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
  onBackupToDrive: () => void;
  onRestoreFromDrive: () => void;
  onCleanAndDeduplicate: () => void;
  onRefreshStatus: () => void;
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
  onBackupToDrive,
  onRestoreFromDrive,
  onCleanAndDeduplicate,
  onRefreshStatus,
}) => {
  // State for Delete Confirmation Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  const allPairs = extractAllPairs(words);
  const relationsByTag = calculateRelationsByTag(words);

  // Handle Clear Database
  const handleConfirmDeleteAll = () => {
    const cleared = clearAllWords();
    onUpdateWords(cleared);
    setIsDeleteModalOpen(false);
    setConfirmInput('');
    onToast('Active dictionary cleared.', 'info');
  };

  return (
    <div id="settings-view-container" className="space-y-6 animate-in fade-in duration-150">
      {/* Overview Stats Card */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4.5 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-slate-100">Database & Online Sync Overview</h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {user ? (
              <span className="flex items-center gap-1 text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
                <Cloud className="w-3 h-3" />
                <span>Primary: Google Drive (Online Sync)</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-400 font-mono bg-slate-900 border border-slate-700 px-2 py-0.5 rounded">
                <Cloud className="w-3 h-3 text-slate-500" />
                <span>Sign in for Online Sync</span>
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3 text-center">
            <span className="text-xs text-slate-400">Total Words</span>
            <p className="text-lg font-bold text-slate-100">{words.length}</p>
          </div>
          <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3 text-center">
            <span className="text-xs text-slate-400">Total Pairs</span>
            <p className="text-lg font-bold text-sky-400">{allPairs.length}</p>
          </div>
          <div className="col-span-2 bg-[#0F172A] border border-[#334155] rounded-lg p-2.5 flex flex-wrap items-center justify-center gap-1.5">
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
        words={words}
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
        onBackupToDrive={onBackupToDrive}
        onRestoreFromDrive={onRestoreFromDrive}
        onCleanAndDeduplicate={onCleanAndDeduplicate}
        onRefreshStatus={onRefreshStatus}
      />

      {/* Verified File Safety & Architecture Assurance */}
      <section
        id="section-verified-storage-security"
        className="bg-[#1E293B] border border-emerald-900/60 rounded-xl p-4.5 space-y-3.5 shadow-sm"
      >
        <div className="flex items-center gap-2 text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          <h3 className="text-sm font-semibold text-slate-100">Verified Cloud Storage Protocol</h3>
          <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800/80 rounded font-mono">
            Safety First
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Manual raw JSON import and export have been decommissioned in favor of authenticated, verified cloud synchronization. All synchronization exclusively operates with the verified database manifest to ensure maximum safety, zero data corruption, and seamless cross-device consistency.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified Database File</span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono break-all">
              {BACKUP_FILE_NAME}
            </p>
            <p className="text-[10px] text-slate-500">
              Strictly checked with schema verification before any load or write.
            </p>
          </div>

          <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Auto-Deduplication</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Canonical graph normalization prevents double records and cleans orphan edges automatically.
            </p>
          </div>

          <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>Isolated Private Storage</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Files are stored strictly within your personal Google Drive storage space.
            </p>
          </div>
        </div>
      </section>

      {/* Reset Active Dictionary (Danger Zone) */}
      <section
        id="section-danger-zone-delete"
        className="bg-[#1E293B] border border-rose-900/50 rounded-xl p-4.5 space-y-3.5 shadow-sm"
      >
        <div className="flex items-center gap-2 text-rose-400">
          <Trash2 className="w-4 h-4" />
          <h3 className="text-sm font-semibold">Reset Active Dictionary</h3>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Clear all {words.length} active words and {allPairs.length} pairs from the current session.
        </p>

        <div className="pt-1">
          <button
            id="btn-open-delete-all-modal"
            onClick={() => {
              setConfirmInput('');
              setIsDeleteModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/40 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Reset Active Dictionary</span>
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
              This will clear the active dictionary ({words.length} words).
              {user && ' You can re-sync your cloud database from Google Drive at any time.'}
            </p>

            <div className="bg-[#0F172A] border border-rose-900/60 p-2.5 rounded-lg text-[11px] text-rose-300/90 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <span>Type CLEAR to confirm resetting active dictionary.</span>
            </div>

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
