import React, { useState, useRef, useEffect } from 'react';
import { Plus, Link2, Database } from 'lucide-react';

interface FloatingAddButtonProps {
  onAddWord: () => void;
  onCreateRelation: () => void;
  onOpenBackupRestore?: () => void;
}

export const FloatingAddButton: React.FC<FloatingAddButtonProps> = ({
  onAddWord,
  onCreateRelation,
  onOpenBackupRestore,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const handleAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <div className="fixed bottom-6 right-4 sm:right-8 z-40" ref={menuRef}>
      <div 
        className={`absolute bottom-full right-0 mb-3 bg-[#1E293B] border border-[#334155] rounded-2xl shadow-2xl p-2 w-56 transition-all duration-200 origin-bottom-right ${
          isOpen 
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="flex flex-col gap-1">
          <button
            type="button"
            id="fab-action-add-word"
            onClick={() => handleAction(onAddWord)}
            className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-slate-800/80 active:bg-slate-800 transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-emerald-500/25 transition-all">
              <Plus className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-200">Tambah Kata</div>
              <div className="text-[10px] text-slate-400">Kata baru ke daftar</div>
            </div>
          </button>

          <button
            type="button"
            id="fab-action-link"
            onClick={() => handleAction(onCreateRelation)}
            className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-slate-800/80 active:bg-slate-800 transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-sky-500/25 transition-all">
              <Link2 className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-200">Kaitkan Pasangan</div>
              <div className="text-[10px] text-slate-400">Hubungkan 2 kata (pasangan)</div>
            </div>
          </button>

          {onOpenBackupRestore && (
            <>
              <div className="h-px bg-[#334155]/50 my-1 mx-2" />
              <button
                type="button"
                id="fab-action-backup-restore"
                onClick={() => handleAction(onOpenBackupRestore)}
                className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-slate-800/80 active:bg-slate-800 transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-indigo-500/25 transition-all">
                  <Database className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-200">Backup & Restore</div>
                  <div className="text-[10px] text-slate-400">Cadangkan & pulihkan data</div>
                </div>
              </button>
            </>
          )}
        </div>
      </div>

      <button
        id="fab-main-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-13 h-13 rounded-full flex items-center justify-center shadow-lg shadow-sky-900/30 transition-all duration-200 cursor-pointer ${
          isOpen 
            ? 'bg-rose-500 hover:bg-rose-600 rotate-45' 
            : 'bg-sky-500 hover:bg-sky-400 hover:scale-105'
        }`}
        title="Tambah kata atau pasangan"
      >
        <Plus className="w-6 h-6 text-slate-950 stroke-[2.5]" />
      </button>
    </div>
  );
};

