import React from 'react';
import { SyncStatus } from '../types';
import { User } from 'firebase/auth';
import { DriveFileInfo } from '../utils/googleDrive';
import {
  Cloud,
  RefreshCw,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface GoogleDriveSyncSectionProps {
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
}

export const GoogleDriveSyncSection: React.FC<GoogleDriveSyncSectionProps> = ({
  user,
  syncStatus,
  isTokenExpired,
  lastSyncedAt,
  cloudWordCount,
  isSigningIn,
  isOperating,
  onSignIn,
  onSignOut,
  onSyncNow,
}) => {
  // Format last synced label
  const getSyncText = () => {
    if (isOperating || syncStatus === 'syncing') {
      return 'Saving to Google Drive...';
    }
    if (isTokenExpired) {
      return 'Session expired — Click Reconnect to resume sync';
    }
    if (syncStatus === 'synced') {
      if (lastSyncedAt) {
        return `Synced automatically at ${lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
      }
      return 'Synced automatically with Drive';
    }
    if (syncStatus === 'unsaved') {
      return 'Saving pending session changes...';
    }
    if (syncStatus === 'error') {
      return 'Sync error — Click Sync Now or reconnect account';
    }
    return 'Cloud auto-sync active';
  };

  return (
    <section
      id="section-google-drive-sync"
      className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 space-y-4 shadow-sm"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#334155]/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Cloud className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <span>Automatic Google Drive Cloud Sync</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <Zap className="w-2.5 h-2.5" />
                <span>Auto-Active</span>
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Changes are saved and timestamped automatically on every session.
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
            <div className="text-left pr-1 max-w-[150px] truncate">
              <p className="text-[11px] font-semibold text-slate-200 truncate">
                {user.displayName || user.email}
              </p>
              <p className="text-[9px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Online & Authenticated</span>
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

      {/* Main Status & Controls */}
      {!user ? (
        <div className="py-4 text-center space-y-3 bg-[#0F172A] rounded-xl border border-[#334155] p-4">
          <p className="text-xs text-slate-300">Sign in with Google to enable automatic cloud synchronization.</p>
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
            <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[#0F172A] rounded-lg border border-[#334155]">
            <div className="flex items-center gap-2.5">
              {syncStatus === 'syncing' || isOperating ? (
                <RefreshCw className="w-4 h-4 text-sky-400 animate-spin" />
              ) : syncStatus === 'synced' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : syncStatus === 'unsaved' ? (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              )}
              <div>
                <p className="text-xs font-semibold text-slate-200">{getSyncText()}</p>
                <p className="text-[11px] text-slate-400">
                  {cloudWordCount !== null ? `${cloudWordCount} words stored on Drive` : 'Automatic synchronization active'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isTokenExpired && (
                <button
                  type="button"
                  id="btn-reconnect-drive-settings"
                  onClick={onSignIn}
                  disabled={isSigningIn}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-600 bg-amber-500/20 hover:bg-amber-500/30 text-xs font-semibold text-amber-200 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSigningIn ? 'animate-spin' : ''}`} />
                  <span>{isSigningIn ? 'Reconnecting...' : 'Reconnect Drive'}</span>
                </button>
              )}

              <button
                type="button"
                id="btn-sync-with-drive"
                onClick={onSyncNow}
                disabled={isOperating || isTokenExpired}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-800 bg-sky-950/40 hover:border-sky-400 text-xs font-semibold text-sky-200 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 text-sky-400 ${isOperating ? 'animate-spin' : ''}`}
                />
                <span>Sync Now</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            <span>Encrypted cloud backup stored directly on your personal Google Drive.</span>
          </div>
        </div>
      )}
    </section>
  );
};
