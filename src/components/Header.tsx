import React from 'react';
import { Database } from 'lucide-react';

interface HeaderProps {
  onOpenBackupRestore?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenBackupRestore }) => {
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
          <h1 className="text-sm font-semibold tracking-tight text-slate-100">
            Who Is The Spy Manual
          </h1>
        </div>

        {/* Right Section: Backup & Restore */}
        <div className="flex items-center gap-2">
          {onOpenBackupRestore && (
            <button
              id="btn-header-backup-restore"
              type="button"
              onClick={onOpenBackupRestore}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700/80 transition-colors cursor-pointer shadow-2xs"
              title="Backup and Restore database locally"
            >
              <Database className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Backup & Restore</span>
              <span className="sm:hidden">Backup</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

