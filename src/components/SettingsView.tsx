import React, { useState, useRef } from 'react';
import { Word, RELATION_TAGS, TAG_METADATA, SyncStatus } from '../types';
import {
  triggerDownloadBackup,
  exportWordsJson,
  validateAndImportJson,
  clearAllWords,
} from '../utils/storage';
import { calculateRelationsByTag, extractAllPairs } from '../utils/wordGraph';
import { GoogleDriveSyncSection } from './GoogleDriveSyncSection';
import { DriveFileInfo } from '../utils/googleDrive';
import { User } from 'firebase/auth';
import {
  Download,
  Upload,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  FileJson,
  Database,
  RefreshCw,
  Info,
  HardDrive,
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
  onBackupToDrive: () => void;
  onRestoreFromDrive: () => void;
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
  onRefreshStatus,
}) => {
  // State for Copy JSON
  const [copied, setCopied] = useState(false);

  // State for Restore
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [importError, setImportError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for Delete Confirmation Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');

  const allPairs = extractAllPairs(words);
  const relationsByTag = calculateRelationsByTag(words);

  // Handle Download Backup
  const handleDownload = () => {
    if (words.length === 0) {
      onToast('Dictionary is currently empty. Downloading empty backup template.', 'info');
    }
    const success = triggerDownloadBackup(words);
    if (success) {
      onToast('Backup file downloaded successfully.', 'success');
    } else {
      onToast('Failed to download backup.', 'error');
    }
  };

  // Handle Copy JSON
  const handleCopyJson = async () => {
    try {
      const json = exportWordsJson(words);
      await navigator.clipboard.writeText(json);
      setCopied(true);
      onToast('Backup JSON copied to clipboard.', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast('Failed to copy to clipboard.', 'error');
    }
  };

  // Handle File Input Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    readFileContent(file);
    e.target.value = '';
  };

  // Handle Drag and Drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readFileContent(file);
    }
  };

  const readFileContent = (file: File) => {
    setImportError(null);
    if (!file.name.endsWith('.json') && file.type !== 'application/json') {
      setImportError('Please upload a valid .json file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportText(content);
        processImportString(content, importMode);
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read selected file.');
    };
    reader.readAsText(file);
  };

  const processImportString = (jsonStr: string, mode: 'replace' | 'merge') => {
    setImportError(null);
    if (!jsonStr.trim()) {
      setImportError('Please provide JSON data to restore.');
      return;
    }

    const res = validateAndImportJson(jsonStr, words, mode);
    if (!res.success || !res.words) {
      setImportError(res.error || 'Invalid backup data format.');
      return;
    }

    onUpdateWords(res.words);
    const count = res.words.length;
    const pairsCount = extractAllPairs(res.words).length;
    onToast(
      mode === 'replace'
        ? `Restored dictionary with ${count} words (${pairsCount} pairs).`
        : `Merged data: total ${count} words (${pairsCount} pairs).`,
      'success'
    );
    setImportText('');
  };

  // Handle Manual Text Import Submit
  const handleManualImport = (e: React.FormEvent) => {
    e.preventDefault();
    processImportString(importText, importMode);
  };

  // Handle Delete All / Clear Cache
  const handleConfirmDeleteAll = () => {
    const cleared = clearAllWords();
    onUpdateWords(cleared);
    setIsDeleteModalOpen(false);
    setConfirmInput('');
    onToast('Local temporary cache cleared.', 'info');
  };

  return (
    <div id="settings-view-container" className="space-y-6 animate-in fade-in duration-150">
      {/* Overview Stats Card */}
      <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-4.5 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-slate-100">Database & Storage Overview</h2>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {user ? (
              <span className="flex items-center gap-1 text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
                <Cloud className="w-3 h-3" />
                <span>Primary: Google Drive</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400 font-mono bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded">
                <HardDrive className="w-3 h-3" />
                <span>Temporary Cache Only</span>
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3 text-center">
            <span className="text-xs text-slate-400">Local Cache Words</span>
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
        onRefreshStatus={onRefreshStatus}
      />

      {/* 1. Local Backup / Export Feature */}
      <section
        id="section-backup-feature"
        className="bg-[#1E293B] border border-[#334155] rounded-xl p-4.5 space-y-4 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-sky-400" />
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Manual JSON Export</h3>
            <p className="text-xs text-slate-400">
              Download an offline file backup copy of your dictionary words and relations.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 pt-1">
          <button
            id="btn-download-backup-json"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-sky-400 hover:bg-sky-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Backup (.json)</span>
          </button>

          <button
            id="btn-copy-backup-json"
            onClick={handleCopyJson}
            className={`inline-flex items-center gap-2 px-3.5 py-2 border rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              copied
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-[#0F172A] hover:bg-slate-800 text-slate-200 border-[#334155]'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>JSON Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Raw JSON</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* 2. Restore / Import Feature */}
      <section
        id="section-restore-feature"
        className="bg-[#1E293B] border border-[#334155] rounded-xl p-4.5 space-y-4 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4 text-sky-400" />
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Manual JSON Restore / Import</h3>
            <p className="text-xs text-slate-400">
              Import words and relations from a JSON backup file.
            </p>
          </div>
        </div>

        {importError && (
          <div className="flex items-start gap-2 p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-lg text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{importError}</span>
          </div>
        )}

        {/* Restore Mode Radio Selectors */}
        <div className="flex items-center gap-4 text-xs text-slate-300">
          <span className="font-medium text-slate-400">Import Mode:</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="importMode"
              value="replace"
              checked={importMode === 'replace'}
              onChange={() => setImportMode('replace')}
              className="accent-sky-400 cursor-pointer"
            />
            <span>Replace temporary cache</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="radio"
              name="importMode"
              value="merge"
              checked={importMode === 'merge'}
              onChange={() => setImportMode('merge')}
              className="accent-sky-400 cursor-pointer"
            />
            <span>Merge with existing</span>
          </label>
        </div>

        {/* Drag & Drop File Upload Box */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-sky-400 bg-sky-500/10'
              : 'border-[#334155] hover:border-slate-500 bg-[#0F172A]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
          <FileJson className="w-7 h-7 text-sky-400 mx-auto mb-2 opacity-80" />
          <p className="text-xs font-semibold text-slate-200">
            Click to upload backup file or drag and drop
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">JSON format (.json)</p>
        </div>

        {/* Or Paste JSON Textarea */}
        <form onSubmit={handleManualImport} className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-slate-400">
              Or paste JSON directly:
            </label>
            {importText && (
              <button
                type="button"
                onClick={() => {
                  setImportText('');
                  setImportError(null);
                }}
                className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            id="textarea-import-json"
            rows={3}
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              setImportError(null);
            }}
            placeholder='Paste JSON array or { "words": [...] } object here...'
            className="w-full p-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-400/80"
          />

          <button
            type="submit"
            id="btn-submit-import-json"
            disabled={!importText.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 border border-[#334155] text-xs font-medium rounded-md transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-3 h-3 text-sky-400" />
            <span>Restore from Text</span>
          </button>
        </form>
      </section>

      {/* 3. Delete All / Clear Cache (Danger Zone) */}
      <section
        id="section-danger-zone-delete"
        className="bg-[#1E293B] border border-rose-900/50 rounded-xl p-4.5 space-y-3.5 shadow-sm"
      >
        <div className="flex items-center gap-2 text-rose-400">
          <Trash2 className="w-4 h-4" />
          <h3 className="text-sm font-semibold">Clear Temporary Local Cache</h3>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Clear {words.length} cached words and {allPairs.length} pairs from your browser's temporary storage.
          {user && ' Your master database saved on Google Drive will remain intact.'}
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
            <span>Clear Local Cache</span>
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
              <h4 className="font-semibold text-sm text-slate-100">Clear Temporary Local Cache?</h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will clear the current browser session cache ({words.length} words).
              {user
                ? ' You can re-download your database anytime from your Google Drive.'
                : ' Note: You are currently not signed in to Google Drive.'}
            </p>

            <div className="bg-[#0F172A] border border-rose-900/60 p-2.5 rounded-lg text-[11px] text-rose-300/90 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <span>Type CLEAR to confirm clearing local cache.</span>
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
                Clear Local Cache
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
