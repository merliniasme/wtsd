import React from 'react';
import { User } from 'firebase/auth';
import { SyncStatus } from '../types';
import { Cloud, RefreshCw, CheckCircle2, AlertTriangle, CloudOff, VenetianMask, ScanSearch } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  syncStatus: SyncStatus;
  isOperating: boolean;
  isSigningIn: boolean;
  lastSyncedAt: Date | null;
  onSignIn: () => void;
  onSync: () => void;
  onGoToSettings?: () => void;
  onOpenAntiCensor?: (tab?: 'analyze' | 'escape') => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  syncStatus,
  isOperating,
  isSigningIn,
  lastSyncedAt,
  onSignIn,
  onSync,
  onGoToSettings,
  onOpenAntiCensor,
}) => {
  // Format last synced label
  const getSyncText = () => {
    if (isOperating || syncStatus === 'syncing') {
      return 'Syncing to Drive...';
    }
    if (!user) {
      return 'Online Sync Off';
    }
    if (syncStatus === 'synced') {
      if (lastSyncedAt) {
        const diffMs = Date.now() - lastSyncedAt.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Cloud Synced (Just now)';
        if (diffMins === 1) return 'Cloud Synced (1m ago)';
        return `Cloud Synced (${diffMins}m ago)`;
      }
      return 'Cloud Synced';
    }
    if (syncStatus === 'unsaved') {
      return 'Syncing changes...';
    }
    if (syncStatus === 'error') {
      return 'Sync Issue';
    }
    return 'Drive Connected';
  };

  return (
    <header
      id="app-main-header"
      className="bg-[#0F172A] border-b border-[#334155]/60 sticky top-0 z-30 shadow-xs"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Brand & Quick Tools */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-base">🕵️</span>
            <h1 className="text-sm font-semibold tracking-tight text-slate-100">
              Spy Dictionary
            </h1>
          </div>

          {onOpenAntiCensor && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="btn-header-analyzer-tool"
                onClick={() => onOpenAntiCensor('analyze')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 text-xs font-semibold transition-colors cursor-pointer"
                title="Analisis Karakter Non-Latin, Homoglif, dan Kode Unicode"
              >
                <ScanSearch className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden sm:inline">Analisis Kata</span>
              </button>

              <button
                type="button"
                id="btn-header-anticensor-tool"
                onClick={() => onOpenAntiCensor('escape')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
                title="Buka Alat Anti-Sensor Homoglif (Sirilik Rusia)"
              >
                <VenetianMask className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Anti-Sensor</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Section: Sync Status & Auth Controls */}
        <div className="flex items-center gap-2">
          {user ? (
            /* Logged in state with Sync Pill & Sync Button */
            <div className="flex items-center gap-1.5 bg-[#1E293B] border border-[#334155] rounded-lg p-1 pr-2">
              {/* Sync Status Button / Pill */}
              <button
                type="button"
                id="btn-header-sync-status"
                onClick={onSync}
                disabled={isOperating}
                title="Click to sync now with Google Drive"
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium text-slate-300 hover:text-sky-200 hover:bg-slate-700/50 transition-colors cursor-pointer disabled:opacity-50"
              >
                {syncStatus === 'syncing' || isOperating ? (
                  <RefreshCw className="w-3 h-3 text-sky-400 animate-spin" />
                ) : syncStatus === 'synced' ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : syncStatus === 'unsaved' ? (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                )}
                <span className="hidden xs:inline-block">{getSyncText()}</span>
              </button>

              {/* Instant Manual Sync Action */}
              <button
                type="button"
                id="btn-header-instant-sync"
                onClick={onSync}
                disabled={isOperating}
                className="p-1 text-slate-400 hover:text-sky-300 hover:bg-slate-700 rounded transition-colors cursor-pointer disabled:opacity-40"
                title="Sync now with Google Drive"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isOperating ? 'animate-spin text-sky-400' : ''}`}
                />
              </button>

              {/* User Avatar / Settings Trigger */}
              <button
                type="button"
                id="btn-header-user-avatar"
                onClick={onGoToSettings}
                className="flex items-center ml-0.5 rounded-full border border-slate-600/80 p-0.5 hover:border-sky-400 transition-colors cursor-pointer"
                title={`Signed in as ${user.displayName || user.email}. Click to manage settings.`}
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Google Account'}
                    referrerPolicy="no-referrer"
                    className="w-5 h-5 rounded-full"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-sky-600 text-[10px] font-bold flex items-center justify-center text-white">
                    {(user.displayName || user.email || 'G')[0].toUpperCase()}
                  </div>
                )}
              </button>
            </div>
          ) : (
            /* Logged out state: Sign In Button */
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-header-google-signin"
                onClick={onSignIn}
                disabled={isSigningIn}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 font-medium text-xs rounded-lg shadow-sm border border-slate-200 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:shadow"
                title="Sign in with Google to access and sync your dictionary online"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
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
                <span>{isSigningIn ? 'Connecting...' : 'Sign in to Sync'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
