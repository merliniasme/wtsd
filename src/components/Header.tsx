import React from 'react';

export const Header: React.FC = () => {
  return (
    <header
      id="app-main-header"
      className="bg-[#0F172A] border-b border-[#334155]/60 sticky top-0 z-30"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <span className="text-base">🕵️</span>
          <h1 className="text-sm font-semibold tracking-tight text-slate-100">
            Spy Dictionary
          </h1>
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          Undercover Word Pairs
        </div>
      </div>
    </header>
  );
};
