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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="bg-[#112240] border border-[#233554] rounded-xl w-full max-w-md shadow-sm overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-[#233554] flex items-center justify-between bg-[#0A192F]">
          <div className="flex items-center gap-2 text-rose-400">
            <Search className="w-5 h-5" />
            <h2 className="font-bold text-[#F8FAFC] tracking-tight">Non-Latin Character Detector</h2>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#F8FAFC] transition-colors p-1 rounded-lg hover:bg-[#1E293B]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-xs text-[#94A3B8] mb-4">
            Found {flaggedWords.length} words containing non-Latin characters (like Cyrillic, emojis, or symbols).
          </p>

          {flaggedWords.length > 0 ? (
            <div className="space-y-2">
              {flaggedWords.map(word => (
                <div key={word.id} className="p-3 bg-[#080F1E] rounded-lg border border-rose-500/25 flex justify-between items-center">
                  <span className="text-sm font-medium text-[#F8FAFC]">{word.term}</span>
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-1 rounded font-semibold border border-rose-500/30">Flagged</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-[#94A3B8] text-sm">
              No non-Latin characters detected!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
