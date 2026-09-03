import React from 'react';
import { Plus, Brain } from 'lucide-react';

interface FloatingAddButtonProps {
  onAddWord: () => void;
  onOpenPuzzle: () => void;
  onClick?: () => void;
}

export const FloatingAddButton: React.FC<FloatingAddButtonProps> = ({
  onAddWord,
  onOpenPuzzle,
  onClick,
}) => {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5">
      {/* Memory Game Button */}
      <button
        id="btn-floating-puzzle-game"
        onClick={onOpenPuzzle}
        aria-label="Play Memory Game"
        title="Play Memory Game"
        className="flex items-center gap-2 px-3.5 sm:px-4 py-3 bg-slate-900/95 hover:bg-slate-800 text-purple-300 hover:text-purple-200 font-semibold text-xs rounded-full shadow-lg shadow-purple-950/40 hover:shadow-purple-900/30 active:scale-95 transition-all duration-150 cursor-pointer border border-purple-500/40 backdrop-blur-md group"
      >
        <Brain className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform stroke-[2.2]" />
        <span className="font-medium tracking-wide">Memory Game</span>
      </button>

      {/* Add Word Button */}
      <button
        id="btn-floating-add-word"
        onClick={onAddWord || onClick}
        aria-label="Add new word"
        title="Add Word"
        className="flex items-center gap-2 px-3.5 sm:px-4 py-3 bg-sky-400 hover:bg-sky-300 text-slate-950 font-semibold text-xs rounded-full shadow-lg shadow-sky-950/50 hover:shadow-sky-400/20 active:scale-95 transition-all duration-150 cursor-pointer border border-sky-300/40"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
        <span className="font-medium tracking-wide">Add Word</span>
      </button>
    </div>
  );
};

