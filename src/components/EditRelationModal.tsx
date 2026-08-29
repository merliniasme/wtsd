import React, { useState, useEffect } from 'react';
import { Word, RelationTag, RELATION_TAGS, TAG_METADATA } from '../types';
import { X } from 'lucide-react';

interface EditRelationModalProps {
  isOpen: boolean;
  onClose: () => void;
  wordA: Word | null;
  wordB: Word | null;
  currentTag: RelationTag | null;
  onSaveTag: (wordAId: string, wordBId: string, oldTag: RelationTag, newTag: RelationTag) => void;
}

export const EditRelationModal: React.FC<EditRelationModalProps> = ({
  isOpen,
  onClose,
  wordA,
  wordB,
  currentTag,
  onSaveTag,
}) => {
  const [selectedTag, setSelectedTag] = useState<RelationTag>('others');

  useEffect(() => {
    if (currentTag) {
      setSelectedTag(currentTag);
    }
  }, [currentTag]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !wordA || !wordB || !currentTag) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveTag(wordA.id, wordB.id, currentTag, selectedTag);
    onClose();
  };

  return (
    <div
      id="edit-relation-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="edit-relation-modal-card"
        className="bg-[#1E293B] w-full max-w-sm rounded-xl border border-[#334155] shadow-2xl p-4.5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Edit Tag Type</h3>
            <p className="text-[11px] text-slate-400">
              {wordA.term} ⇄ {wordB.term}
            </p>
          </div>
          <button
            id="btn-close-edit-tag-modal"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer rounded hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tag Types Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-slate-300">Tag Types</label>
            <div className="flex flex-wrap gap-1.5">
              {RELATION_TAGS.map((t) => {
                const meta = TAG_METADATA[t];
                const isSelected = selectedTag === t;

                return (
                  <button
                    type="button"
                    key={t}
                    id={`btn-edit-select-tag-${t}`}
                    onClick={() => setSelectedTag(t)}
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
          <div className="pt-1">
            <button
              type="submit"
              id="btn-submit-edit-rel-tag"
              className="w-full py-2 bg-sky-400 hover:bg-sky-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Save Tag Type
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
