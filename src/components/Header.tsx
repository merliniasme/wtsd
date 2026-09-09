import React, { useState, useRef, useEffect } from 'react';
import { SyncStatus } from '../types';
import { RefreshCw, CheckCircle2, AlertTriangle, LogOut, User as UserIcon } from 'lucide-react';
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // Format last synced label
  const getSyncText = () => {
    if (isOperating || syncStatus === 'syncing') return 'Syncing to Server...';
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
    if (syncStatus === 'unsaved') return 'Syncing changes...';
    if (syncStatus === 'error') return 'Sync Issue';
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
            src="/app-icon.jpg"
            alt="Who Is The Spy Manual Logo"
            className="w-7 h-7 rounded-lg object-cover border border-cyan-500/30 shadow-xs shadow-cyan-950"
            referrerPolicy="no-referrer"
          />
          <h1 className="text-sm font-semibold tracking-tight text-slate-100 ">
            Who Is The Spy Manual
          </h1>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3 relative">
          
          {user && (
            <div ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition-colors border border-slate-600"
              >
                <UserIcon className="w-4 h-4 text-slate-300" />
              </button>
              
              {isDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#1E293B] border border-slate-700 rounded-xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 border-b border-slate-700/60 mb-2">
                    <p className="text-xs text-slate-400">Signed in as</p>
                    <p className="text-sm font-semibold text-sky-400">{user.username}</p>
                  </div>
                  
                  <div className="px-3 py-2 flex items-center gap-2 text-xs text-slate-300">
                    {syncStatus === 'syncing' || isOperating ? (
                      <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin" />
                    ) : syncStatus === 'synced' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : syncStatus === 'unsaved' ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    )}
                    <span>{getSyncText()}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onSignOut();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
