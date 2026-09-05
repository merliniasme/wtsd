import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { SyncStatus } from '../types';
import { RefreshCw } from 'lucide-react';
import appLogo from '../assets/logo.jpg';

interface HeaderProps {
  user: User | null;
  syncStatus: SyncStatus;
  isOperating: boolean;
  isSigningIn: boolean;
  lastSyncedAt: Date | null;
  onSignIn: () => void;
  onSync: () => void;
  onGoToSettings?: () => void;
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
}) => {
  // Temporary visual color feedback:
  // white (neutral default) -> yellow (syncing) -> green/red (success/failed for a while) -> white (neutral again)
  const [visualColor, setVisualColor] = useState<'white' | 'yellow' | 'green' | 'red'>('white');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSyncingRef = useRef<boolean>(false);

  useEffect(() => {
    const isCurrentlySyncing = isOperating || syncStatus === 'syncing';
    const wasSyncing = prevSyncingRef.current;

    if (isCurrentlySyncing) {
      // Transition to active syncing (yellow)
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setVisualColor('yellow');
    } else if (wasSyncing && !isCurrentlySyncing) {
      // Sync operation completed: show green or red for a while, then revert to white
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      if (syncStatus === 'error') {
        setVisualColor('red');
      } else {
        setVisualColor('green');
      }

      timerRef.current = setTimeout(() => {
        setVisualColor('white');
        timerRef.current = null;
      }, 2500);
    }

    prevSyncingRef.current = isCurrentlySyncing;
  }, [isOperating, syncStatus]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleManualSync = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisualColor('yellow');
    onSync();
  };

  const getSyncButtonColorClasses = () => {
    switch (visualColor) {
      case 'green':
        return 'bg-emerald-500/20 border-emerald-400/60 text-emerald-400 shadow-sm shadow-emerald-950/60 ring-1 ring-emerald-500/30';
      case 'red':
        return 'bg-rose-500/20 border-rose-400/60 text-rose-400 shadow-sm shadow-rose-950/60 ring-1 ring-rose-500/30';
      case 'yellow':
        return 'bg-amber-500/20 border-amber-400/60 text-amber-400 shadow-sm shadow-amber-950/60 ring-1 ring-amber-500/30';
      case 'white':
      default:
        return 'bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/50 shadow-xs';
    }
  };

  const getSyncTooltip = () => {
    if (visualColor === 'yellow') {
      return 'Syncing to Google Drive...';
    }
    if (visualColor === 'green') {
      return 'Sync successful (Green) - Returning to neutral';
    }
    if (visualColor === 'red') {
      return 'Sync failed (Red) - Click to retry';
    }
    return lastSyncedAt
      ? 'Drive connected (Neutral) - Click to sync now'
      : 'Drive connected (Neutral) - Click to sync now';
  };

  return (
    <header
      id="app-main-header"
      className="bg-[#0F172A] border-b border-[#334155]/60 sticky top-0 z-30 shadow-xs"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <img
            src={appLogo}
            alt="Who Is The Spy Manual Logo"
            className="w-7 h-7 rounded-lg object-cover border border-cyan-500/30 shadow-xs shadow-cyan-950"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-sm font-semibold tracking-tight text-slate-100">
            Who Is The Spy Manual
          </h1>
        </div>

        {/* Right Section: Sync Controls & Auth */}
        <div className="flex items-center gap-2">
          {user ? (
            /* Logged in state: Compact single sync button + Avatar */
            <div className="flex items-center gap-1.5 bg-[#1E293B] border border-[#334155] rounded-lg p-1">
              {/* Single color-coded manual sync button */}
              <button
                type="button"
                id="btn-header-manual-sync"
                onClick={handleManualSync}
                disabled={isOperating}
                title={getSyncTooltip()}
                aria-label={getSyncTooltip()}
                className={`h-7 w-7 flex items-center justify-center rounded-md border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${getSyncButtonColorClasses()}`}
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 transition-transform ${
                    isOperating || syncStatus === 'syncing' || visualColor === 'yellow'
                      ? 'animate-spin'
                      : ''
                  }`}
                />
              </button>

              {/* User Avatar / Settings Trigger */}
              <button
                type="button"
                id="btn-header-user-avatar"
                onClick={onGoToSettings}
                className="flex items-center rounded-full border border-slate-600/80 p-0.5 hover:border-sky-400 transition-colors cursor-pointer"
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
