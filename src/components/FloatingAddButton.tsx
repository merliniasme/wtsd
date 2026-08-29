import React from 'react';
import { Plus } from 'lucide-react';

interface FloatingAddButtonProps {
  onClick: () => void;
}

export const FloatingAddButton: React.FC<FloatingAddButtonProps> = ({ onClick }) => {
  return (
    <button
      id="btn-floating-add-word"
      onClick={onClick}
      aria-label="Add new word"
      title="Add Word"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-sky-400 hover:bg-sky-300 text-slate-950 font-semibold text-xs rounded-full shadow-lg shadow-sky-950/50 hover:shadow-sky-400/20 active:scale-95 transition-all duration-150 cursor-pointer border border-sky-300/40"
    >
      <Plus className="w-4 h-4 stroke-[2.5]" />
      <span className="font-medium tracking-wide">Add Word</span>
    </button>
  );
};
