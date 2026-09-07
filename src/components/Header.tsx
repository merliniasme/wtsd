import React from 'react';
import { SyncStatus } from '../types';
import { RefreshCw, CheckCircle2, AlertTriangle, LogOut } from 'lucide-react';
import appLogo from '../assets/logo.jpg';
import { ApiClient } from '../utils/api';

interface HeaderProps {
  syncStatus: SyncStatus;
  isOperating: boolean;
  lastSyncedAt: Date | null;
  onSync: () => void;
  onGoToSettings?: () => void;
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  syncStatus,
  isOperating,
  lastSyncedAt,
  onSync,
  onGoToSettings,
  onSignOut,
}) => {
  const user = ApiClient.user;

  // Format last synced label
  const getSyncText = () => {
    if (isOperating || syncStatus === 'syncing') {
      return 'Syncing to Server...';
    }
    if (syncStatus === 'synced') {
      if (lastSyncedAt) {
        const diffMs = Date.now() - lastSyncedAt.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Synced (Just now)';
        if (diffMins === 1) return 'Synced (1m ago)';
        return `Synced (${diffMins}m ago)`;
      }
      return 'Synced';
    }
    if (syncStatus === 'unsaved') {
      return 'Syncing changes...';
    }
    if (syncStatus === 'error') {
      return 'Sync Issue';
    }
    return 'Server Connected';
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

        {/* Right Section: Sync Status & Auth Controls */}
        <div className="flex items-center gap-2">
          {user && (
            <div className="flex items-center gap-1.5 bg-[#1E293B] border border-[#334155] rounded-lg p-1 pr-2">
              {/* Sync Status Button / Pill */}
              <button
                type="button"
                id="btn-header-sync-status"
                onClick={onSync}
                disabled={isOperating}
                title="Click to sync now with the server"
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50 text-slate-300 hover:text-sky-200 hover:bg-slate-700/50`}
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
                title="Sync now with Server"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isOperating ? 'animate-spin text-sky-400' : ''}`}
                />
              </button>

              {/* User Settings Trigger */}
              <button
                type="button"
                id="btn-header-user-settings"
                onClick={onGoToSettings}
                className="flex items-center ml-0.5 rounded border border-slate-600/80 px-2 py-1 hover:border-sky-400 transition-colors cursor-pointer bg-slate-800"
                title={`Signed in as ${user.username}. Click to manage settings.`}
              >
                <span className="text-[11px] font-mono font-bold text-sky-300">{user.username}</span>
              </button>

              {/* Sign out */}
              <button
                type="button"
                onClick={onSignOut}
                className="ml-1 p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
