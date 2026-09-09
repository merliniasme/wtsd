import React, { useState, useRef, useEffect } from 'react';
import { Word, LocalBackupSnapshot } from '../types';
import {
  inspectBackupJson,
  downloadBackupJsonFile,
  copyBackupJsonToClipboard,
  loadLocalSnapshots,
  saveLocalSnapshot,
  deleteLocalSnapshot,
  clearAllLocalSnapshots,
  validateAndImportJson,
} from '../utils/storage';
import { calculateTotalRelations } from '../utils/wordGraph';
import {
  Database,
  Download,
  Upload,
  Copy,
  Check,
  Clock,
  Trash2,
  AlertTriangle,
  FileText,
  X,
  RotateCcw,
  CheckCircle2,
  Shield,
  Layers,
} from 'lucide-react';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWords: Word[];
  onRestoreWords: (newWords: Word[], message: string) => void;
  onAddToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  currentWords,
  onRestoreWords,
  onAddToast,
}) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'restore'>('backup');

  // Backup State
  const [snapshotName, setSnapshotName] = useState('');
  const [copied, setCopied] = useState(false);

  // Restore File State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [inspectionResult, setInspectionResult] = useState<{
    success: boolean;
    words?: Word[];
    totalWords?: number;
    totalPairs?: number;
    lastModified?: number;
    error?: string;
  } | null>(null);

  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [createSafetyBackup, setCreateSafetyBackup] = useState(true);

  // Saved Snapshots State
  const [snapshots, setSnapshots] = useState<LocalBackupSnapshot[]>([]);

  // Load snapshots when modal opens
  useEffect(() => {
    if (isOpen) {
      setSnapshots(loadLocalSnapshots());
      // Reset selected file
      setSelectedFileContent(null);
      setSelectedFileName('');
      setInspectionResult(null);
      setSnapshotName('');
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPairCount = calculateTotalRelations(currentWords);

  // Download Backup JSON
  const handleDownloadBackup = () => {
    downloadBackupJsonFile(currentWords);
    onAddToast(`Backup file downloaded (${currentWords.length} words, ${currentPairCount} pairs)`, 'success');
  };

  // Copy Backup JSON
  const handleCopyJson = async () => {
    const ok = await copyBackupJsonToClipboard(currentWords);
    if (ok) {
      setCopied(true);
      onAddToast('Backup JSON copied to clipboard', 'info');
      setTimeout(() => setCopied(false), 2000);
    } else {
      onAddToast('Failed to copy to clipboard', 'error');
    }
  };

  // Create Local Snapshot
  const handleCreateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentWords.length === 0) {
      onAddToast('Dictionary is empty, nothing to backup.', 'info');
      return;
    }
    const snap = saveLocalSnapshot(currentWords, snapshotName);
    setSnapshots(loadLocalSnapshots());
    setSnapshotName('');
    onAddToast(`Local snapshot created: "${snap.name}"`, 'success');
  };

  // Delete Local Snapshot
  const handleDeleteSnapshot = (id: string, name: string) => {
    if (!window.confirm(`Delete snapshot "${name}"?`)) return;
    const updated = deleteLocalSnapshot(id);
    setSnapshots(updated);
    onAddToast(`Snapshot deleted`, 'info');
  };

  // Clear All Local Snapshots
  const handleClearAllSnapshots = () => {
    if (!window.confirm('Are you sure you want to delete all saved local snapshots?')) return;
    clearAllLocalSnapshots();
    setSnapshots([]);
    onAddToast('All local snapshots cleared', 'info');
  };

  // File parsing
  const handleFileProcess = (file: File) => {
    if (!file.name.endsWith('.json')) {
      onAddToast('Please select a valid .json backup file', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (!content) return;
      setSelectedFileContent(content);
      setSelectedFileName(file.name);
      const inspection = inspectBackupJson(content);
      setInspectionResult(inspection);
      if (!inspection.success) {
        onAddToast(inspection.error || 'Failed to parse JSON backup file', 'error');
      }
    };
    reader.onerror = () => {
      onAddToast('Failed to read file from disk', 'error');
    };
    reader.readAsText(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  // Perform restore from uploaded file
  const handleApplyRestoreFromFile = () => {
    if (!selectedFileContent || !inspectionResult || !inspectionResult.success) {
      onAddToast('No valid backup loaded to restore', 'error');
      return;
    }

    // Safety backup first
    if (createSafetyBackup && currentWords.length > 0) {
      saveLocalSnapshot(currentWords, `Pre-Restore Auto Backup (${new Date().toLocaleTimeString()})`);
      setSnapshots(loadLocalSnapshots());
    }

    const res = validateAndImportJson(selectedFileContent, currentWords, restoreMode);
    if (!res.success || !res.words) {
      onAddToast(res.error || 'Restore failed', 'error');
      return;
    }

    const msg = restoreMode === 'replace'
      ? `Restored ${res.words.length} words (${res.pairCount ?? 0} pairs) from backup`
      : `Merged backup into dictionary: ${res.words.length} total words`;

    onRestoreWords(res.words, msg);
    onClose();
  };

  // Restore from an existing local snapshot
  const handleRestoreFromSnapshot = (snapshot: LocalBackupSnapshot) => {
    const confirmText = `Restore snapshot "${snapshot.name}" (${snapshot.wordCount} words, ${snapshot.pairCount} pairs)?\n\nClick OK to replace current database with this snapshot.`;
    if (!window.confirm(confirmText)) return;

    // Safety backup of current
    if (currentWords.length > 0) {
      saveLocalSnapshot(currentWords, `Pre-Restore Auto Backup (${new Date().toLocaleTimeString()})`);
    }

    onRestoreWords(
      snapshot.words,
      `Restored snapshot "${snapshot.name}" (${snapshot.wordCount} words, ${snapshot.pairCount} pairs)`
    );
    onClose();
  };

  // Format relative timestamp
  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div
      id="backup-restore-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="backup-restore-modal"
        className="bg-[#1E293B] border border-[#334155] w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#334155] flex items-center justify-between bg-slate-900/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Database Backup & Restore</h2>
              <p className="text-[11px] text-slate-400">
                Manage local backups, download JSON files, or restore previous versions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 pb-0 border-b border-[#334155]/60 flex items-center gap-2 bg-slate-900/20 shrink-0">
          <button
            id="tab-btn-backup"
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'backup'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backup Local</span>
          </button>
          <button
            id="tab-btn-restore"
            type="button"
            onClick={() => setActiveTab('restore')}
            className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'restore'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restore DB</span>
            {snapshots.length > 0 && (
              <span className="px-1.5 py-0.2 bg-slate-800 text-[10px] text-slate-300 rounded-full">
                {snapshots.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'backup' ? (
            /* BACKUP SECTION */
            <div className="space-y-4">
              {/* Current Status Banner */}
              <div className="bg-slate-900/60 border border-[#334155]/60 rounded-xl p-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Active Database Status:</span>
                </div>
                <div className="flex items-center gap-2 font-medium">
                  <span className="text-sky-300 font-semibold">{currentWords.length} words</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-300 font-semibold">{currentPairCount} pairs</span>
                </div>
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Download Backup File */}
                <div className="bg-slate-900/40 border border-[#334155] rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
                      <Download className="w-4 h-4 text-sky-400" />
                      <span>Download Backup File</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Save complete dictionary as a local .json file to your device.
                    </p>
                  </div>
                  <button
                    id="btn-download-backup-file"
                    type="button"
                    onClick={handleDownloadBackup}
                    className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    <Download className="w-3.5 h-3.5 stroke-[2.2]" />
                    <span>Download JSON File</span>
                  </button>
                </div>

                {/* Copy JSON to Clipboard */}
                <div className="bg-slate-900/40 border border-[#334155] rounded-xl p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
                      <Copy className="w-4 h-4 text-emerald-400" />
                      <span>Copy Backup to Clipboard</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Copy raw database JSON to paste or store in notes or text files.
                    </p>
                  </div>
                  <button
                    id="btn-copy-backup-json"
                    type="button"
                    onClick={handleCopyJson}
                    className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-[#334155] transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.2]" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-300" />
                        <span>Copy Raw JSON</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Create Snapshot in Browser Storage */}
              <div className="bg-slate-900/40 border border-[#334155] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <span>Save Local Snapshot</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Create an instant restore point saved locally in your browser.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleCreateSnapshot} className="flex gap-2">
                  <input
                    type="text"
                    value={snapshotName}
                    onChange={(e) => setSnapshotName(e.target.value)}
                    placeholder="Optional label (e.g., Before adding anime words)"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-sky-500"
                  />
                  <button
                    type="submit"
                    className="py-1.5 px-3 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold rounded-lg transition-colors cursor-pointer shrink-0 shadow-xs"
                  >
                    Save Snapshot
                  </button>
                </form>
              </div>

              {/* Safety note */}
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-sky-950/30 border border-sky-800/40 text-sky-300 text-xs">
                <Shield className="w-4 h-4 shrink-0 mt-0.5 text-sky-400" />
                <span>
                  Everything is saved 100% locally on your machine. Your backup files and snapshots contain all terms, mutual links, and tags.
                </span>
              </div>
            </div>
          ) : (
            /* RESTORE SECTION */
            <div className="space-y-5">
              {/* Option A: Restore from File */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  1. Restore from Backup File (.json)
                </h3>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".json"
                  className="hidden"
                />

                {!selectedFileContent ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                      dragOver
                        ? 'border-sky-400 bg-sky-500/10'
                        : 'border-slate-700 hover:border-slate-500 bg-slate-900/30 hover:bg-slate-900/50'
                    }`}
                  >
                    <Upload className="w-7 h-7 text-sky-400 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-200">
                      Click to choose backup file or drag & drop here
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">Supports previous backup JSON formats</p>
                  </div>
                ) : (
                  /* File Loaded Preview */
                  <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-sky-400" />
                        <span className="text-xs font-semibold text-slate-200 truncate max-w-xs">
                          {selectedFileName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFileContent(null);
                          setSelectedFileName('');
                          setInspectionResult(null);
                        }}
                        className="text-xs text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        Choose different file
                      </button>
                    </div>

                    {inspectionResult?.success ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                            <span className="text-slate-400 block text-[11px]">Words in Backup</span>
                            <span className="text-base font-bold text-sky-400">
                              {inspectionResult.totalWords}
                            </span>
                          </div>
                          <div className="bg-slate-950/70 p-2.5 rounded-lg border border-slate-800">
                            <span className="text-slate-400 block text-[11px]">Pairs in Backup</span>
                            <span className="text-base font-bold text-emerald-400">
                              {inspectionResult.totalPairs}
                            </span>
                          </div>
                        </div>

                        {/* Mode Switcher */}
                        <div className="space-y-1.5 pt-1">
                          <label className="text-[11px] font-semibold text-slate-300 block">
                            Restore Mode:
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setRestoreMode('replace')}
                              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                                restoreMode === 'replace'
                                  ? 'bg-sky-950/50 border-sky-500 text-sky-300'
                                  : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              <div className="font-semibold text-xs text-slate-200">Replace Database</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Overwrite all words with this backup
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setRestoreMode('merge')}
                              className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                                restoreMode === 'merge'
                                  ? 'bg-sky-950/50 border-sky-500 text-sky-300'
                                  : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              <div className="font-semibold text-xs text-slate-200">Merge with Current</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Combine with existing words & links
                              </div>
                            </button>
                          </div>
                        </div>

                        {/* Safety Backup Checkbox */}
                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={createSafetyBackup}
                            onChange={(e) => setCreateSafetyBackup(e.target.checked)}
                            className="rounded border-slate-700 text-sky-500 focus:ring-sky-500"
                          />
                          <span>Create automatic safety snapshot before restoring</span>
                        </label>

                        {/* Apply Button */}
                        <button
                          id="btn-apply-restore"
                          type="button"
                          onClick={handleApplyRestoreFromFile}
                          className="w-full py-2.5 px-4 bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>
                            {restoreMode === 'replace'
                              ? `Restore & Replace with ${inspectionResult.totalWords} Words`
                              : `Merge ${inspectionResult.totalWords} Words into Database`}
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-rose-400 p-2 bg-rose-950/30 border border-rose-800/40 rounded-lg">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span>{inspectionResult?.error || 'Invalid backup format'}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="h-px bg-[#334155]/60 my-2" />

              {/* Option B: Restore from Saved Snapshots */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    2. Previous Local Snapshots ({snapshots.length})
                  </h3>
                  {snapshots.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllSnapshots}
                      className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      Clear snapshots
                    </button>
                  )}
                </div>

                {snapshots.length === 0 ? (
                  <div className="text-center py-6 px-3 bg-slate-900/30 rounded-xl border border-slate-800 text-slate-400 text-xs space-y-1">
                    <Clock className="w-5 h-5 text-slate-500 mx-auto mb-1" />
                    <p className="font-medium text-slate-300">No saved snapshots found</p>
                    <p className="text-[11px] text-slate-500">
                      Snapshots are automatically created before restoring, or can be saved from the Backup tab.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {snapshots.map((snap) => (
                      <div
                        key={snap.id}
                        className="bg-slate-900/60 border border-[#334155] rounded-xl p-3 flex items-center justify-between gap-3 hover:border-slate-600 transition-all"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs text-slate-200 truncate">
                              {snap.name}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {formatTimeAgo(snap.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400">
                            <span className="text-sky-300">{snap.wordCount} words</span>
                            <span>•</span>
                            <span className="text-slate-300">{snap.pairCount} pairs</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRestoreFromSnapshot(snap)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-sky-400/15 hover:bg-sky-400/25 border border-sky-500/30 text-sky-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                            title="Restore this snapshot"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSnapshot(snap.id, snap.name)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Delete snapshot"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#334155] bg-slate-900/60 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Local Database Storage</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
