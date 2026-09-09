import React, { useState, useRef } from 'react';
import { Word } from '../types';
import { ApiClient } from '../utils/api';
import {
  Download,
  Upload,
  Database,
  Lock,
  CheckCircle,
  AlertTriangle,
  FileJson,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface DatabaseBackupRestoreProps {
  words: Word[];
  onRestoreBackup: (words: Word[]) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const DatabaseBackupRestore: React.FC<DatabaseBackupRestoreProps> = ({
  words,
  onRestoreBackup,
  onToast,
}) => {
  const currentUser = ApiClient.user;
  const isAdmin = currentUser?.role === 'admin';
  const hasBackupPermission = isAdmin || ApiClient.hasPermission('canBackupRestore');

  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreConfirmWords, setRestoreConfirmWords] = useState<Word[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Backup Export Handler
  const handleExportBackup = () => {
    if (!hasBackupPermission) {
      onToast('You do not have permission to download database backups', 'error');
      return;
    }

    try {
      const backupPayload = {
        version: '1.2.0',
        exportedAt: new Date().toISOString(),
        exportedBy: currentUser?.username || 'system',
        totalWords: words.length,
        words,
      };

      const jsonStr = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `whos_the_spy_backup_${timestamp}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onToast(`Successfully exported backup with ${words.length} dictionary entries`, 'success');
    } catch (err: any) {
      onToast('Failed to export backup: ' + (err.message || 'Unknown error'), 'error');
    }
  };

  // Restore File Upload Handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        let parsedWords: Word[] = [];
        if (Array.isArray(parsed)) {
          parsedWords = parsed;
        } else if (parsed && Array.isArray(parsed.words)) {
          parsedWords = parsed.words;
        } else {
          throw new Error('Unrecognized JSON format. File must contain an array of words.');
        }

        // Validate structure
        const validWords = parsedWords.filter(
          (w) => w && typeof w.id === 'string' && typeof w.term === 'string' && Array.isArray(w.relations)
        );

        if (validWords.length === 0) {
          throw new Error('No valid dictionary word entries found in the file.');
        }

        setRestoreConfirmWords(validWords);
      } catch (err: any) {
        onToast('Invalid backup file: ' + err.message, 'error');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  // Confirm Restore
  const handleConfirmRestore = async () => {
    if (!restoreConfirmWords) return;
    try {
      setIsRestoring(true);
      await onRestoreBackup(restoreConfirmWords);
      onToast(`Database successfully restored with ${restoreConfirmWords.length} words`, 'success');
      setRestoreConfirmWords(null);
    } catch (err: any) {
      onToast('Restore failed: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  // Case 1: Restricted / No Permission View
  if (!hasBackupPermission) {
    return (
      <section
        id="section-backup-restore-locked"
        className="bg-[#1E293B] border border-amber-500/30 rounded-xl p-5 space-y-4 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-slate-100">Database Backup & Restore</h4>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
                  Admin Only Feature
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Restricted to administrators unless granted explicit permission by an admin account.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Authorization Required</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Database backup archives contain the complete repository of words, secret associations, and relational tags.
            To protect data integrity, only administrators or accounts granted the{' '}
            <strong className="text-slate-200">"Database Backup & Restore"</strong> permission by an administrator
            can download or restore database snapshots.
          </p>
          <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80">
            <span>Current Role: {currentUser?.role || 'Restricted User'}</span>
            <span>Logged in as: {currentUser?.username || 'Guest'}</span>
          </div>
        </div>
      </section>
    );
  }

  // Case 2: Authorized View (Admin or delegated permission)
  return (
    <section
      id="section-database-backup-restore"
      className="bg-[#1E293B] border border-[#334155] rounded-xl p-5 space-y-5 shadow-sm"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-slate-100">Database Backup & Restore</h4>
              {isAdmin ? (
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold uppercase tracking-wider">
                  Admin Privileged
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold">
                  Permission Granted by Admin
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Export and import complete JSON dictionary archives safely across environments.
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-400 font-mono bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
          <span>Active words: </span>
          <strong className="text-slate-200">{words.length}</strong>
        </div>
      </div>

      {/* Action Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Backup Card */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sky-400">
              <Download className="w-4 h-4" />
              <h5 className="text-xs font-semibold text-slate-200">Download Backup File</h5>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Export all {words.length} terms, relationship pairings, and semantic tags into a standardized JSON snapshot file.
            </p>
          </div>

          <button
            id="btn-download-database-backup"
            type="button"
            onClick={handleExportBackup}
            disabled={words.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Download Database JSON ({words.length} Words)</span>
          </button>
        </div>

        {/* Restore Card */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400">
              <Upload className="w-4 h-4" />
              <h5 className="text-xs font-semibold text-slate-200">Restore from Backup</h5>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Load a previously exported dictionary JSON file to replace or reconstruct the database collection.
            </p>
          </div>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json,application/json"
              className="hidden"
              id="input-restore-backup-file"
            />
            <button
              id="btn-restore-database-backup"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs rounded-lg border border-slate-700 transition-colors cursor-pointer shadow-sm"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Select Backup JSON to Restore...</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal / Prompt for Restore */}
      {restoreConfirmWords && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Confirm Database Overwrite</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The selected backup file contains{' '}
            <strong className="text-white">{restoreConfirmWords.length} words</strong>.
            Restoring this backup will replace the current active dictionary of{' '}
            <strong className="text-white">{words.length} words</strong> and sync immediately with the cloud database.
          </p>
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleConfirmRestore}
              disabled={isRestoring}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isRestoring ? 'Restoring Database...' : `Yes, Restore ${restoreConfirmWords.length} Words`}
            </button>
            <button
              type="button"
              onClick={() => setRestoreConfirmWords(null)}
              disabled={isRestoring}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
