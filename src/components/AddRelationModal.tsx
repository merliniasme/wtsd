import React, { useState, useEffect } from 'react';
import { Word, RelationTag, RELATION_TAGS, TAG_METADATA } from '../types';
import { X, Clipboard, Check } from 'lucide-react';

interface AddRelationModalProps {
  sourceWord: Word | null;
  isOpen: boolean;
  onClose: () => void;
  onAddRelation: (
    sourceWordId: string,
    targetTerm: string,
    tag: RelationTag
  ) => { success: boolean; duplicate?: boolean; error?: string };
  allWords: Word[];
}

export const AddRelationModal: React.FC<AddRelationModalProps> = ({
  sourceWord,
  isOpen,
  onClose,
  onAddRelation,
}) => {
  const [targetTerm, setTargetTerm] = useState('');
  const [tag, setTag] = useState<RelationTag>('others');
  const [error, setError] = useState<string | null>(null);
  const [pasted, setPasted] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen || !sourceWord) return null;

  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setTargetTerm(text.trim());
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
    setError(null);

    const clean = targetTerm.trim();
    if (!clean) {
      setError('Please paste a counterpart word.');
      return;
    }

    if (clean.toLowerCase() === sourceWord.term.toLowerCase()) {
      setError('A word cannot be linked to itself.');
      return;
    }

    const res = onAddRelation(sourceWord.id, clean, tag);
    if (!res.success) {
      if (res.duplicate) {
        setError(
          `Relation between "${sourceWord.term}" and "${clean}" under [${TAG_METADATA[tag].label}] already exists.`
        );
      } else {
        setError(res.error || 'Failed to add relation.');
      }
      return;
    }

    handleClose();
  };

  const handleClose = () => {
    setTargetTerm('');
    setTag('others');
    setError(null);
    onClose();
  };

  return (
    <div
      id="add-relation-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        id="add-relation-modal-card"
        className="bg-[#1E293B] w-full max-w-sm rounded-xl border border-[#334155] shadow-2xl p-4.5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Link Pair</h3>
            <p className="text-[11px] text-slate-400">
              Link with <span className="font-semibold text-sky-400">"{sourceWord.term}"</span>
            </p>
          </div>
          <button
            id="btn-close-relation-modal"
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer rounded hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <p className="text-xs text-rose-400 bg-rose-950/40 border border-rose-800/60 rounded px-2.5 py-1.5">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Target Word input */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-300">Counterpart Word</label>
            <div className="relative flex items-center">
              <input
                id="input-relation-target-term"
                type="text"
                readOnly
                value={targetTerm}
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text');
                  if (text && text.trim()) {
                    setTargetTerm(text.trim());
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
                id="btn-paste-target-word"
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

          {/* Tag Types Selector */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-medium text-slate-300">Tag Types</label>
            <div className="flex flex-wrap gap-1.5">
              {RELATION_TAGS.map((t) => {
                const meta = TAG_METADATA[t];
                const isSelected = tag === t;

                return (
                  <button
                    type="button"
                    key={t}
                    id={`btn-add-rel-select-category-${t}`}
                    onClick={() => setTag(t)}
                    title={meta.label}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-sky-400 text-slate-950 font-semibold shadow-2xs'
                        : 'bg-[#0F172A] text-slate-400 hover:text-slate-200 border border-[#334155]'
                    }`}
                  >
                    <span className="font-mono text-[10px] opacity-80">{meta.shortCode}</span>
                    <span className="truncate max-w-[200px]">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              id="btn-submit-add-relation"
              disabled={!targetTerm.trim()}
              className="w-full py-2 bg-sky-400 hover:bg-sky-300 disabled:opacity-40 disabled:hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs"
            >
              Link Pair
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
