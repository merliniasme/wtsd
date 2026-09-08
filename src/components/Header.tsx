import React from 'react';

export const Header: React.FC = () => {
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
      </div>
    </header>
  );
};

