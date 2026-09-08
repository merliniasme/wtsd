#!/bin/bash
sed -i 's/import { Plus, Link2, Puzzle, Image as ImageIcon, Settings, ShieldAlert } from '"'lucide-react'"';/import { Plus, Link2, Puzzle, Image as ImageIcon, Settings, ShieldAlert, Search } from '"'lucide-react'"';/g' src/components/FloatingAddButton.tsx

sed -i '/interface FloatingAddButtonProps {/a \  onOpenNonLatin: () => void;' src/components/FloatingAddButton.tsx

sed -i '/export const FloatingAddButton: React.FC<FloatingAddButtonProps> = ({/a \  onOpenNonLatin,' src/components/FloatingAddButton.tsx

sed -i '/<div className="h-px bg=\[#334155\]\/50 my-1 mx-2" \/>/i \
          <button\
            type="button"\
            id="fab-action-nonlatin"\
            onClick={() => handleAction(onOpenNonLatin)}\
            className="w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-slate-800/80 active:bg-slate-800 transition-colors cursor-pointer group"\
          >\
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-amber-500/25 transition-all">\
              <Search className="w-4 h-4 stroke-[2.2]" />\
            </div>\
            <div>\
              <div className="text-sm font-semibold text-slate-200">Deteksi Non-Latin</div>\
              <div className="text-[10px] text-slate-400">Cek karakter aneh di dict</div>\
            </div>\
          </button>' src/components/FloatingAddButton.tsx
