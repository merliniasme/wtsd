import React from 'react';
import { ActiveTab } from '../types';
import { Link2, Type, Settings } from 'lucide-react';

interface TabsNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  pairsCount?: number;
  wordsCount?: number;
}

export const TabsNav: React.FC<TabsNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div
      id="main-tabs-navigation"
      className="flex items-center gap-1 p-1 bg-[#1E293B] border border-[#334155] rounded-lg w-full sm:w-auto"
    >
      <button
        id="tab-btn-pairs"
        type="button"
        onClick={() => onTabChange('pairs')}
        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-1.5 px-4 rounded-md text-xs font-medium transition-all cursor-pointer ${
          activeTab === 'pairs'
            ? 'bg-sky-400 text-slate-950 font-semibold shadow-xs'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`}
      >
        <Link2 className="w-3.5 h-3.5" />
        <span>Pairs</span>
      </button>

      <button
        id="tab-btn-words"
        type="button"
        onClick={() => onTabChange('words')}
        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-1.5 px-4 rounded-md text-xs font-medium transition-all cursor-pointer ${
          activeTab === 'words'
            ? 'bg-sky-400 text-slate-950 font-semibold shadow-xs'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`}
      >
        <Type className="w-3.5 h-3.5" />
        <span>Words</span>
      </button>

      <button
        id="tab-btn-settings"
        type="button"
        onClick={() => onTabChange('settings')}
        className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 py-1.5 px-4 rounded-md text-xs font-medium transition-all cursor-pointer ${
          activeTab === 'settings'
            ? 'bg-sky-400 text-slate-950 font-semibold shadow-xs'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`}
      >
        <Settings className="w-3.5 h-3.5" />
        <span>Settings</span>
      </button>
    </div>
  );
};

