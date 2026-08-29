import React, { useState, useEffect } from 'react';
import { Word } from '../types';
import { X, Clipboard, Check } from 'lucide-react';

interface EditWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  word: Word | null;
  onSaveTerm: (wordId: string, newTerm: string) => { success: boolean; error?: string };
}

export const EditWordModal: React.FC<EditWordModalProps> = ({
  isOpen,
  onClose,
  word,
  onSaveTerm,
}) => {
  const [term, setTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pasted, setPasted] = useState(false);

  useEffect(() => {
    if (word) {
      setTerm(word.term);
      setError(null);
    }
  }, [word]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !word) return null;

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
      setError('Clipboard permission required to paste.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = term.trim();
    if (!clean) {
      setError('Word term cannot be empty. Please paste a term.');
      return;
    }

    const res = onSaveTerm(word.id, clean);
    if (!res.success) {
      setError(res.error || 'Failed to update term.');
      return;
    }

    onClose();
  };

  return (
    <div
      id="edit-word-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="edit-word-modal-card"
        className="bg-[#1E293B] w-full max-w-sm rounded-xl border border-[#334155] shadow-2xl p-4.5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Edit Word</h3>
            <p className="text-[11px] text-slate-400">Update word across all relations</p>
          </div>
          <button
            id="btn-close-edit-word-modal"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer rounded hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 rounded px-2.5 py-1.5">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-300">Word Term</label>
            <div className="relative flex items-center">
              <input
                id="input-edit-term"
                type="text"
                readOnly
                value={term}
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text');
                  if (text && text.trim()) {
                    setTerm(text.trim());
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
                id="btn-paste-edit-term"
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
          </div>

          <div className="pt-2">
            <button
              type="submit"
              id="btn-submit-edit-term"
              disabled={!term.trim()}
              className="w-full py-2 bg-sky-400 hover:bg-sky-300 disabled:opacity-40 disabled:hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
