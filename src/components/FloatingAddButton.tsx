import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  X,
  Link2,
  ScanSearch,
  VenetianMask,
  Brain,
  Settings,
  Sparkles,
} from 'lucide-react';

interface FloatingAddButtonProps {
  onAddWord: () => void;
  onCreateRelation: () => void;
  onOpenAnalyzer: () => void;
  onOpenAntiCensor: () => void;
  onOpenPuzzle: () => void;
  onGoToSettings?: () => void;
}

export const FloatingAddButton: React.FC<FloatingAddButtonProps> = ({
  onAddWord,
  onCreateRelation,
  onOpenAnalyzer,
  onOpenAntiCensor,
  onOpenPuzzle,
  onGoToSettings,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Handle action click
  const handleAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <>
      {/* Backdrop for outside click */}
      {isOpen && (
        <div
          id="fab-menu-backdrop"
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs transition-opacity duration-150"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Floating Pop-up Card */}
      {isOpen && (
        <div
          ref={menuRef}
          id="fab-popup-menu"
          className="fixed bottom-20 right-4 sm:right-6 z-50 w-72 sm:w-80 bg-[#1E293B] border border-[#334155] rounded-2xl p-2.5 shadow-2xl shadow-slate-950/90 animate-in zoom-in-95 fade-in slide-in-from-bottom-2 duration-150 space-y-1"
        >
          {/* Header of Menu */}
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[#334155]/60 mb-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>Menu Fitur Utama</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60">
              Quick Actions
            </span>
          </div>

          {/* Action 1: Add Single Word */}
          <button
            type="button"
            id="fab-action-add-word"
            onClick={() => handleAction(onAddWord)}
            className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-slate-800/80 active:bg-slate-800 transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-sky-500/25 transition-all">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-100 group-hover:text-sky-300 transition-colors">
                Tambah Kata Baru
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Input kata tunggal ke kamus
              </div>
            </div>
          </button>

          {/* Action 2: Create Relation / Pair */}
          <button
            type="button"
            id="fab-action-create-relation"
            onClick={() => handleAction(onCreateRelation)}
            className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-slate-800/80 active:bg-slate-800 transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-emerald-500/25 transition-all">
              <Link2 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-100 group-hover:text-emerald-300 transition-colors">
                Hubungkan Pasangan
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Pasangkan 2 kata (Spy & Undercover)
              </div>
            </div>
          </button>

          {/* Action 3: Non-Latin Character Analyzer */}
          <button
            type="button"
            id="fab-action-analyzer"
            onClick={() => handleAction(onOpenAnalyzer)}
            className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-slate-800/80 active:bg-slate-800 transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-cyan-500/25 transition-all">
              <ScanSearch className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                Analisis Karakter & Homoglif
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Deteksi huruf asing, Sirilik, & Unicode
              </div>
            </div>
          </button>

          {/* Action 4: Anti-Censor Tool */}
          <button
            type="button"
            id="fab-action-anticensor"
            onClick={() => handleAction(onOpenAntiCensor)}
            className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-slate-800/80 active:bg-slate-800 transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-amber-500/25 transition-all">
              <VenetianMask className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-100 group-hover:text-amber-300 transition-colors">
                Alat Anti-Sensor Homoglif
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Samarkan teks agar lolos sensor kata
              </div>
            </div>
          </button>

          {/* Action 5: Memory Puzzle Game */}
          <button
            type="button"
            id="fab-action-puzzle"
            onClick={() => handleAction(onOpenPuzzle)}
            className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-slate-800/80 active:bg-slate-800 transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-purple-500/25 transition-all">
              <Brain className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-slate-100 group-hover:text-purple-300 transition-colors">
                Main Tebak Kata
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                Latihan hafalan pasangan rahasia
              </div>
            </div>
          </button>

          {/* Action 6: Settings & Cloud Sync */}
          {onGoToSettings && (
            <button
              type="button"
              id="fab-action-settings"
              onClick={() => handleAction(onGoToSettings)}
              className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-slate-800/80 active:bg-slate-800 transition-colors cursor-pointer group border-t border-[#334155]/60 mt-1"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-700/50 border border-slate-600/60 text-slate-300 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-slate-700 transition-all">
                <Settings className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                  Pengaturan & Cadangan
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  Google Drive, statistik, & Raw Import
                </div>
              </div>
            </button>
          )}
        </div>
      )}

      {/* Single Main Floating Action Button */}
      <div className="fixed bottom-6 right-4 sm:right-6 z-50">
        <button
          ref={buttonRef}
          id="btn-main-floating-action"
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Tutup menu fitur' : 'Buka menu fitur utama'}
          title={isOpen ? 'Tutup Menu' : 'Menu Fitur & Aksi Cepat'}
          className={`flex items-center gap-2 px-4 py-3 rounded-full font-semibold text-xs shadow-xl transition-all duration-200 cursor-pointer active:scale-95 ${
            isOpen
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 shadow-slate-950/80'
              : 'bg-sky-400 hover:bg-sky-300 text-slate-950 border border-sky-300/50 shadow-sky-950/60 hover:shadow-sky-400/20'
          }`}
        >
          <div
            className={`transition-transform duration-200 ${
              isOpen ? 'rotate-45' : 'rotate-0'
            }`}
          >
            {isOpen ? (
              <X className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <Plus className="w-5 h-5 stroke-[2.5]" />
            )}
          </div>
          <span className="font-semibold tracking-wide">
            {isOpen ? 'Tutup' : 'Fitur'}
          </span>
        </button>
      </div>
    </>
  );
};
