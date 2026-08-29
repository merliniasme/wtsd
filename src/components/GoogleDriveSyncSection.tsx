import React, { useState } from 'react';
import { Word, SyncStatus } from '../types';
import { User } from 'firebase/auth';
import { DriveFileInfo } from '../utils/googleDrive';
import {
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  LogOut,
  Check,
  AlertCircle,
  Clock,
  FileCheck,
  ShieldCheck,
  Zap,
  Sparkles,
  Layers,
} from 'lucide-react';

interface GoogleDriveSyncSectionProps {
  words: Word[];
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

export const GoogleDriveSyncSection: React.FC<GoogleDriveSyncSectionProps> = ({
  words,
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
  // Confirmation Modal State for Restore / Overwrite
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionLabel: string;
    onConfirm: () => void;
  } | null>(null);

  const handleRestoreClick = () => {
    if (!cloudFileInfo?.id) return;
    setConfirmModal({
      isOpen: true,
      title: 'Restore from Google Drive?',
      description: `This will refresh your dictionary with the latest cloud database (${cloudWordCount ?? 'all'} words) stored on your Google Drive.`,
      actionLabel: 'Restore & Sync',
      onConfirm: () => {
        setConfirmModal(null);
        onRestoreFromDrive();
      },
    });
  };

  return (
    <section
      id="section-google-drive-sync"
      className="bg-[#1E293B] border border-sky-900/60 rounded-xl p-4.5 space-y-4 shadow-sm relative overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#334155]/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Cloud className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-100">Google Drive Online Master Database</h3>
              <span className="text-[10px] px-1.5 py-0.2 bg-sky-950 text-sky-300 border border-sky-800/80 rounded font-mono">
                Full Online Sync
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live cloud database stored in your Google Drive with zero offline redundancy.
            </p>
          </div>
        </div>

        {/* User Auth Status Pill */}
        {user ? (
          <div className="flex items-center gap-2 bg-[#0F172A] border border-[#334155] rounded-lg px-2.5 py-1.5 self-start sm:self-auto">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Google Account'}
                referrerPolicy="no-referrer"
                className="w-5 h-5 rounded-full border border-slate-600"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-sky-600 text-[10px] font-bold flex items-center justify-center text-white">
                {(user.displayName || user.email || 'G')[0].toUpperCase()}
              </div>
            )}
            <div className="text-left pr-1 max-w-[140px] truncate">
              <p className="text-[11px] font-semibold text-slate-200 truncate">
                {user.displayName || user.email}
              </p>
              <p className="text-[9px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Online & Synchronized</span>
              </p>
            </div>
            <button
              type="button"
              id="btn-google-signout"
              onClick={onSignOut}
              className="p-1 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer rounded hover:bg-slate-800"
              title="Sign out from Google Drive"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : null}
      </div>

      {/* Main Auth / Drive Controls */}
      {!user ? (
        <div className="py-4 text-center space-y-3 bg-[#0F172A] rounded-xl border border-[#334155] p-5">
          <div className="max-w-md mx-auto space-y-1.5">
            <h4 className="text-xs font-semibold text-slate-200">Sign in to connect your Google Drive Database</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              All word pairs and undercover relations are stored securely on your personal Google Drive with automated real-time synchronization and deduplication.
            </p>
          </div>

          {/* Official Styled Google Sign In Button */}
          <div className="pt-2 flex justify-center">
            <button
              type="button"
              id="btn-google-signin"
              onClick={onSignIn}
              disabled={isSigningIn}
              className="inline-flex items-center gap-2.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 font-medium text-xs rounded-lg shadow-sm border border-slate-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:shadow"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>{isSigningIn ? 'Connecting to Google...' : 'Sign in with Google'}</span>
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 pt-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Files are stored strictly in your private Google Drive storage.</span>
          </div>
        </div>
      ) : (
        /* Logged In Dashboard & Actions */
        <div className="space-y-3.5">
          {/* Cloud File Status Banner */}
          <div className="bg-[#0F172A] border border-[#334155] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5">
                {cloudFileInfo ? (
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Clock className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <span>
                    {cloudFileInfo ? 'Google Drive Cloud Database Active' : 'Initial Drive DB Connecting'}
                  </span>
                  {cloudWordCount !== null && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-800 text-sky-300 rounded border border-slate-700">
                      {cloudWordCount} words online
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-slate-400">
                  {lastSyncedAt ? (
                    <>
                      Last synchronized:{' '}
                      <span className="text-slate-300 font-medium">
                        {lastSyncedAt.toLocaleString()}
                      </span>
                    </>
                  ) : (
                    'Real-time auto-sync is active.'
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                id="btn-refresh-cloud-status"
                onClick={onRefreshStatus}
                disabled={isOperating}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 border border-[#334155] rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1"
                title="Check latest cloud status"
              >
                <RefreshCw
                  className={`w-3 h-3 text-sky-400 ${isOperating ? 'animate-spin' : ''}`}
                />
                <span>Refresh Status</span>
              </button>
            </div>
          </div>

          {/* Sync Behavior Info Pill */}
          <div className="flex items-center gap-2 text-[11px] text-sky-300 bg-sky-950/40 border border-sky-900/60 rounded-lg px-3 py-2">
            <Zap className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>
              <strong>Real-Time Online Sync:</strong> All changes are auto-saved straight to your Google Drive database with automated deduplication to prevent double data.
            </span>
          </div>

          {/* Cloud Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
            {/* 1. Occasional Sync / Sync Now */}
            <button
              type="button"
              id="btn-sync-with-drive"
              onClick={onSyncNow}
              disabled={isOperating}
              className="flex flex-col items-start p-3 rounded-lg border border-sky-800/70 bg-sky-950/25 hover:border-sky-400 hover:bg-sky-950/40 transition-all text-left group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            >
              <div className="flex items-center gap-1.5 text-sky-400 mb-1">
                <RefreshCw
                  className={`w-4 h-4 ${isOperating && syncStatus === 'syncing' ? 'animate-spin' : ''}`}
                />
                <span className="text-xs font-semibold text-sky-200 group-hover:text-sky-100">
                  Online Sync Now
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Re-sync and unify Google Drive database.
              </p>
            </button>

            {/* 2. Clean & Deduplicate */}
            <button
              type="button"
              id="btn-clean-deduplicate"
              onClick={onCleanAndDeduplicate}
              disabled={isOperating}
              className="flex flex-col items-start p-3 rounded-lg border border-emerald-900/70 bg-emerald-950/25 hover:border-emerald-400 hover:bg-emerald-950/40 transition-all text-left group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            >
              <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-semibold text-emerald-200 group-hover:text-emerald-100">
                  Clean & Deduplicate
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Scan & eliminate double data or orphan relations.
              </p>
            </button>

            {/* 3. Force Push to Drive */}
            <button
              type="button"
              id="btn-backup-to-drive"
              onClick={onBackupToDrive}
              disabled={isOperating}
              className="flex flex-col items-start p-3 rounded-lg border border-[#334155] bg-[#0F172A] hover:border-sky-400/80 hover:bg-slate-800/60 transition-all text-left group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
            >
              <div className="flex items-center gap-1.5 text-sky-400 mb-1">
                <CloudUpload className="w-4 h-4" />
                <span className="text-xs font-semibold text-slate-200 group-hover:text-sky-300">
                  Push to Drive
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Upload current database ({words.length} words) to Drive.
              </p>
            </button>

            {/* 4. Restore from Drive */}
            <button
              type="button"
              id="btn-restore-from-drive"
              onClick={handleRestoreClick}
              disabled={isOperating || !cloudFileInfo}
              className="flex flex-col items-start p-3 rounded-lg border border-[#334155] bg-[#0F172A] hover:border-sky-400/80 hover:bg-slate-800/60 transition-all text-left group cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
            >
              <div className="flex items-center gap-1.5 text-sky-400 mb-1">
                <CloudDownload className="w-4 h-4" />
                <span className="text-xs font-semibold text-slate-200 group-hover:text-sky-300">
                  Pull from Drive
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {cloudFileInfo
                  ? `Pull cloud database (${cloudWordCount ?? 'all'} words) directly.`
                  : 'No database found on Drive.'}
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal?.isOpen && (
        <div
          id="gdrive-confirm-modal-backdrop"
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmModal(null);
          }}
        >
          <div
            id="gdrive-confirm-modal-card"
            className="bg-[#1E293B] w-full max-w-sm rounded-xl border border-sky-800/80 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-2 text-sky-400">
              <AlertCircle className="w-5 h-5" />
              <h4 className="font-semibold text-sm text-slate-100">{confirmModal.title}</h4>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{confirmModal.description}</p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors cursor-pointer border border-[#334155]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="flex-1 py-2 bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{confirmModal.actionLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

