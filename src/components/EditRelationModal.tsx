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
      className="fixed inset-0 z-50 bg-[#0A192F]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="edit-relation-modal-card"
        className="bg-[#112240] w-full max-w-sm rounded-xl border border-[#233554] shadow-sm p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#F8FAFC] tracking-tight">Edit Tag Type</h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              {wordA.term} ⇄ {wordB.term}
            </p>
          </div>
          <button
            id="btn-close-edit-tag-modal"
            onClick={onClose}
            className="p-1.5 text-[#94A3B8] hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-[#1E293B]"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tag Types Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#94A3B8]">Tag Types</label>
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#00D2FF] text-[#0A192F] font-semibold'
                        : 'bg-[#0A192F] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#233554]'
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
              className="w-full py-2.5 bg-[#00D2FF] hover:bg-[#38BDF8] text-[#0A192F] font-semibold text-xs rounded-lg transition-all duration-200 active:scale-[0.98] cursor-pointer shadow-sm"
            >
              Save Tag Type
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
