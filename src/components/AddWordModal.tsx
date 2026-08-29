import React, { useState } from 'react';
import { X, Clipboard, Check } from 'lucide-react';

interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWord: (term: string) => { success: boolean; error?: string };
}

export const AddWordModal: React.FC<AddWordModalProps> = ({
  isOpen,
  onClose,
  onAddWord,
}) => {
  const [term, setTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pasted, setPasted] = useState(false);

  if (!isOpen) return null;

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setTerm(text.trim());
          setError(null);
          setPasted(true);
          setTimeout(() => setPasted(false), 1200);
          return;
        }
      }
    } catch {
      setError('Clipboard permission denied. Please allow clipboard access.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = term.trim();
    if (!clean) {
      setError('Please paste a word first.');
      return;
    }

    const res = onAddWord(clean);
    if (!res.success) {
      setError(res.error || 'Failed to add word.');
      return;
    }

    setTerm('');
    setError(null);
    onClose();
  };

  const handleClose = () => {
    setTerm('');
    setError(null);
    onClose();
  };

  return (
    <div
      id="add-word-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        id="add-word-modal-card"
        className="bg-[#1E293B] w-full max-w-sm rounded-xl border border-[#334155] shadow-xl p-4 space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header with Title & Close button */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-100">Add Word</h3>
          <button
            id="btn-close-add-word-modal"
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer rounded hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 rounded px-2.5 py-1.5">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Read-only input with Paste button */}
          <div className="relative flex items-center">
            <input
              id="input-add-word-term"
              type="text"
              readOnly
              value={term}
              onPaste={(e) => {
                const pastedText = e.clipboardData.getData('text');
                if (pastedText && pastedText.trim()) {
                  setTerm(pastedText.trim());
                  setError(null);
                  setPasted(true);
                  setTimeout(() => setPasted(false), 1200);
                }
              }}
              placeholder="Click paste button..."
              className="w-full pl-3 pr-20 py-2 bg-[#0F172A] text-slate-100 text-sm rounded-lg border border-[#334155] focus:outline-none cursor-default font-sans placeholder:text-slate-500"
            />
            <button
              type="button"
              id="btn-paste-word"
              onClick={handlePaste}
              className={`absolute right-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                pasted
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-sky-400 border border-[#334155]'
              }`}
            >
              {pasted ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pasted</span>
                </>
              ) : (
                <>
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Paste</span>
                </>
              )}
            </button>
          </div>

          {/* Add Word Button */}
          <button
            type="submit"
            id="btn-submit-add-word"
            disabled={!term.trim()}
            className="w-full py-2 bg-sky-400 hover:bg-sky-300 disabled:opacity-40 disabled:hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs"
          >
            Add Word
          </button>
        </form>
      </div>
    </div>
  );
};
