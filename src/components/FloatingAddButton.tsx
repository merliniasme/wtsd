import React, { useState, useRef, useEffect } from 'react';
import { Plus, Link2, Puzzle, Image as ImageIcon, Settings, Lock, Sparkles } from 'lucide-react';
import { ApiClient } from '../utils/api';

interface FloatingAddButtonProps {
  onOpenNonLatin: () => void;
  onOpenAntiCensor: () => void;
  onAddWord: () => void;
  onCreateRelation: () => void;
  onOpenScreenshotScanner?: () => void;
  onOpenPuzzle: () => void;
  onOpenWePlayEditor: () => void;
  onGoToSettings?: () => void;
  onToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const FloatingAddButton: React.FC<FloatingAddButtonProps> = ({
  onAddWord,
  onCreateRelation,
  onOpenScreenshotScanner,
  onOpenPuzzle,
  onOpenWePlayEditor,
  onGoToSettings,
  onToast,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const canEditDictionary = ApiClient.hasPermission('canEditDictionary');
  const canUseWePlay = ApiClient.hasPermission('canUseWePlayEditor');
  const canPlayMemory = ApiClient.hasPermission('canPlayMemoryGame');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (allowed: boolean, action: () => void, featureName: string) => {
    setIsOpen(false);
    if (!allowed) {
      if (onToast) {
        onToast(`Permission restricted: "${featureName}" is locked for your account by admin.`, 'error');
      }
      return;
    }
    action();
  };

  return (
    <div className="fixed bottom-20 sm:bottom-8 right-4 sm:right-8 z-40" ref={menuRef}>
      <div
        className={`absolute bottom-full right-0 mb-3 bg-[#112240] border border-[#233554] rounded-xl shadow-md p-2 w-64 transition-all duration-200 origin-bottom-right ${
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex flex-col gap-1">
          {/* Add Word */}
          <button
            type="button"
            id="fab-action-add-word"
            onClick={() => handleAction(canEditDictionary, onAddWord, 'Tambah Kata')}
            className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer group ${
              canEditDictionary ? 'hover:bg-[#1E293B] active:bg-[#1E293B]' : 'opacity-60 hover:bg-[#1E293B]/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#F8FAFC]">Tambah Kata Baru</div>
                <div className="text-[10px] text-[#94A3B8]">Daftarkan term ke sistem</div>
              </div>
            </div>
            {!canEditDictionary && <Lock className="w-3.5 h-3.5 text-[#94A3B8] shrink-0 mr-1" />}
          </button>

          {/* Link Words */}
          <button
            type="button"
            id="fab-action-link"
            onClick={() => handleAction(canEditDictionary, onCreateRelation, 'Kaitkan Kata')}
            className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer group ${
              canEditDictionary ? 'hover:bg-[#1E293B] active:bg-[#1E293B]' : 'opacity-60 hover:bg-[#1E293B]/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#00D2FF]/10 border border-[#00D2FF]/20 text-[#00D2FF] flex items-center justify-center shrink-0">
                <Link2 className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#F8FAFC]">Kaitkan Kata</div>
                <div className="text-[10px] text-[#94A3B8]">Buat relasi (Sinonim dll)</div>
              </div>
            </div>
            {!canEditDictionary && <Lock className="w-3.5 h-3.5 text-[#94A3B8] shrink-0 mr-1" />}
          </button>

          {/* Scan Game Result Screenshots (SS Verified) */}
          {onOpenScreenshotScanner && (
            <button
              type="button"
              id="fab-action-scan-ss"
              onClick={() =>
                handleAction(canEditDictionary, onOpenScreenshotScanner, 'Scan Screenshot Results')
              }
              className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer group ${
                canEditDictionary
                  ? 'hover:bg-[#1E293B] active:bg-[#1E293B]'
                  : 'opacity-60 hover:bg-[#1E293B]/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#00D2FF]/15 border border-[#00D2FF]/30 text-[#00D2FF] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#F8FAFC] flex items-center gap-1.5">
                    Scan Hasil Game
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-mono bg-[#00D2FF]/15 text-[#00D2FF]">
                      SSV
                    </span>
                  </div>
                  <div className="text-[10px] text-[#94A3B8]">Auto-input pasang kata dari SS</div>
                </div>
              </div>
              {!canEditDictionary && <Lock className="w-3.5 h-3.5 text-[#94A3B8] shrink-0 mr-1" />}
            </button>
          )}

          <div className="h-px bg-[#233554] my-1 mx-2" />

          {/* WePlay Meme Editor */}
          <button
            type="button"
            id="fab-action-weplay"
            onClick={() => handleAction(canUseWePlay, onOpenWePlayEditor, 'WePlay Meme Editor')}
            className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer group ${
              canUseWePlay ? 'hover:bg-[#1E293B] active:bg-[#1E293B]' : 'opacity-60 hover:bg-[#1E293B]/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
                <ImageIcon className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#F8FAFC]">WePlay Meme</div>
                <div className="text-[10px] text-[#94A3B8]">Generator screenshot palsu</div>
              </div>
            </div>
            {!canUseWePlay && <Lock className="w-3.5 h-3.5 text-[#94A3B8] shrink-0 mr-1" />}
          </button>

          {/* Memory Graph Puzzle */}
          <button
            type="button"
            id="fab-action-puzzle"
            onClick={() => handleAction(canPlayMemory, onOpenPuzzle, 'Memory Graph Game')}
            className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors cursor-pointer group ${
              canPlayMemory ? 'hover:bg-[#1E293B] active:bg-[#1E293B]' : 'opacity-60 hover:bg-[#1E293B]/40'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                <Puzzle className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[#F8FAFC]">Memory Graph</div>
                <div className="text-[10px] text-[#94A3B8]">Main tebak kaitan kata</div>
              </div>
            </div>
            {!canPlayMemory && <Lock className="w-3.5 h-3.5 text-[#94A3B8] shrink-0 mr-1" />}
          </button>

          {onGoToSettings && (
            <>
              <div className="h-px bg-[#233554] my-1 mx-2" />
              <button
                type="button"
                id="fab-action-settings"
                onClick={() => {
                  setIsOpen(false);
                  onGoToSettings();
                }}
                className="w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-[#1E293B] active:bg-[#1E293B] transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-[#233554]/50 border border-[#233554] text-[#94A3B8] flex items-center justify-center shrink-0">
                  <Settings className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#F8FAFC]">Pengaturan</div>
                  <div className="text-[10px] text-[#94A3B8]">Buka panel setelan</div>
                </div>
              </button>
            </>
          )}
        </div>
      </div>

      <button
        id="fab-main-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md transition-all duration-200 cursor-pointer ${
          isOpen
            ? 'bg-rose-500 hover:bg-rose-600 rotate-45 text-white'
            : 'bg-[#00D2FF] hover:bg-[#38BDF8] text-[#0A192F] active:scale-95'
        }`}
        title="Buka menu aksi"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>
    </div>
  );
};
