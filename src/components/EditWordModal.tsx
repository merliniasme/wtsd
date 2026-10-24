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
      className="fixed inset-0 z-50 bg-[#0A192F]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="edit-word-modal-card"
        className="bg-[#112240] w-full max-w-sm rounded-xl border border-[#233554] shadow-sm p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#F8FAFC] tracking-tight">Edit Word</h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">Update word across all relations</p>
          </div>
          <button
            id="btn-close-edit-word-modal"
            onClick={onClose}
            className="p-1.5 text-[#94A3B8] hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-[#1E293B]"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#94A3B8]">Word Term</label>
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
                className="w-full pl-3 pr-20 py-2.5 bg-[#080F1E] text-[#F8FAFC] text-sm rounded-lg border border-[#233554] focus:outline-none cursor-default font-sans placeholder:text-[#64748B]"
              />
              <button
                type="button"
                id="btn-paste-edit-term"
                onClick={handlePaste}
                className={`absolute right-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  pasted
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-[#112240] hover:bg-[#1E293B] text-[#00D2FF] border border-[#233554]'
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

          <div className="pt-1">
            <button
              type="submit"
              id="btn-submit-edit-term"
              disabled={!term.trim()}
              className="w-full py-2.5 bg-[#00D2FF] hover:bg-[#38BDF8] disabled:opacity-40 disabled:hover:bg-[#00D2FF] text-[#0A192F] font-semibold text-xs rounded-lg transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed shadow-sm"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
