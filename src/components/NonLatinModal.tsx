import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Word } from '../types';

interface NonLatinModalProps {
  isOpen: boolean;
  onClose: () => void;
  words: Word[];
}

export const NonLatinModal: React.FC<NonLatinModalProps> = ({ isOpen, onClose, words }) => {
  if (!isOpen) return null;

  const nonLatinRegex = /[^\x00-\x7F]/;
  const flaggedWords = words.filter(w => nonLatinRegex.test(w.term));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-[#1E293B] border border-rose-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-[#334155] flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2 text-rose-400">
            <Search className="w-5 h-5" />
            <h2 className="font-semibold text-slate-100">Non-Latin Character Detector</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-xs text-slate-300 mb-4">
            Found {flaggedWords.length} words containing non-Latin characters (like Cyrillic, emojis, or symbols).
          </p>

          {flaggedWords.length > 0 ? (
            <div className="space-y-2">
              {flaggedWords.map(word => (
                <div key={word.id} className="p-3 bg-slate-800 rounded-lg border border-rose-500/20 flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-200">{word.term}</span>
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-1 rounded">Flagged</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-sm">
              No non-Latin characters detected!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
