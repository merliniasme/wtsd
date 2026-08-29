import React, { useState, useEffect, useMemo } from 'react';
import { Word, RelationTag, RELATION_TAGS, TAG_METADATA } from '../types';
import { X, Search, Check, Link2, Plus, Clipboard, AlertCircle } from 'lucide-react';

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
  allWords,
}) => {
  // Mode: 'select_existing' (strict list search) | 'create_new' (explicit add & link)
  const [mode, setMode] = useState<'select_existing' | 'create_new'>('select_existing');
  
  // Selection from existing words
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);

  // For explicitly adding a brand-new word
  const [newTerm, setNewTerm] = useState('');
  const [pastedNew, setPastedNew] = useState(false);

  // Tag type selection
  const [tag, setTag] = useState<RelationTag>('others');
  const [error, setError] = useState<string | null>(null);

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMode('select_existing');
      setSearchQuery('');
      setSelectedWord(null);
      setNewTerm('');
      setTag('others');
      setError(null);
    }
  }, [isOpen, sourceWord]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // List of other words in the dictionary (excluding source word)
  const candidateWords = useMemo(() => {
    if (!sourceWord) return [];
    return allWords.filter((w) => w.id !== sourceWord.id);
  }, [allWords, sourceWord]);

  // Filter candidate words by search query
  const filteredCandidates = useMemo(() => {
    const clean = searchQuery.trim().toLowerCase();
    if (!clean) return candidateWords;

    return candidateWords.filter((w) => w.term.toLowerCase().includes(clean));
  }, [candidateWords, searchQuery]);

  // Map of existing relation tags with the source word
  const existingRelationsMap = useMemo(() => {
    if (!sourceWord) return new Map<string, RelationTag[]>();
    const map = new Map<string, RelationTag[]>();
    for (const rel of sourceWord.relations) {
      const existing = map.get(rel.targetWordId) || [];
      existing.push(rel.tag);
      map.set(rel.targetWordId, existing);
    }
    return map;
  }, [sourceWord]);

  if (!isOpen || !sourceWord) return null;

  const handlePasteNewTerm = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setNewTerm(text.trim());
          setError(null);
          setPastedNew(true);
          setTimeout(() => setPastedNew(false), 1200);
          return;
        }
      }
    } catch {
      setError('Clipboard permission required.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let targetTerm = '';

    if (mode === 'select_existing') {
      if (!selectedWord) {
        setError('Please select an existing word from the list below.');
        return;
      }
      targetTerm = selectedWord.term;
    } else {
      targetTerm = newTerm.trim();
      if (!targetTerm) {
        setError('Please enter or paste a word to add & link.');
        return;
      }
      if (targetTerm.toLowerCase() === sourceWord.term.toLowerCase()) {
        setError('A word cannot be linked to itself.');
        return;
      }
    }

    const res = onAddRelation(sourceWord.id, targetTerm, tag);
    if (!res.success) {
      if (res.duplicate) {
        setError(
          `Relation between "${sourceWord.term}" and "${targetTerm}" under [${TAG_METADATA[tag].label}] already exists.`
        );
      } else {
        setError(res.error || 'Failed to add relation.');
      }
      return;
    }

    handleClose();
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedWord(null);
    setNewTerm('');
    setTag('others');
    setError(null);
    setMode('select_existing');
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
        className="bg-[#1E293B] w-full max-w-md rounded-xl border border-[#334155] shadow-2xl p-4.5 space-y-4 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[#334155]/60">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-sky-400" />
              <span>Link Word Relation</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Connecting with <span className="font-semibold text-sky-300">"{sourceWord.term}"</span>
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

        {/* Mode Switch Tabs */}
        <div className="flex items-center gap-1 bg-[#0F172A] p-1 rounded-lg border border-[#334155]">
          <button
            type="button"
            id="tab-mode-select-existing"
            onClick={() => {
              setMode('select_existing');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer text-center ${
              mode === 'select_existing'
                ? 'bg-sky-400 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Choose from Existing ({candidateWords.length})
          </button>
          <button
            type="button"
            id="tab-mode-create-new"
            onClick={() => {
              setMode('create_new');
              setError(null);
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
              mode === 'create_new'
                ? 'bg-sky-400 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Word & Link</span>
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="flex items-center gap-1.5 text-xs text-rose-300 bg-rose-950/50 border border-rose-800/60 rounded px-2.5 py-1.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 overflow-hidden flex flex-col flex-1">
          {mode === 'select_existing' ? (
            /* SELECT FROM EXISTING WORDS ONLY */
            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <label className="text-[11px] font-medium text-slate-300 flex items-center justify-between">
                <span>Select Target Word</span>
                <span className="text-[10px] text-slate-400">
                  {selectedWord ? `Selected: "${selectedWord.term}"` : 'Pick from dictionary'}
                </span>
              </label>

              {/* Search box to filter candidate words */}
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
                <input
                  id="input-search-candidate-words"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search existing words to link..."
                  className="w-full pl-8 pr-7 py-1.5 bg-[#0F172A] text-slate-100 text-xs rounded-lg border border-[#334155] focus:outline-none focus:border-sky-400/80 font-sans placeholder:text-slate-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 text-slate-400 hover:text-slate-200 cursor-pointer p-0.5"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Scrollable list of existing words */}
              <div
                id="existing-words-candidate-list"
                className="flex-1 overflow-y-auto max-h-40 border border-[#334155] bg-[#0F172A] rounded-lg p-1.5 space-y-1"
              >
                {candidateWords.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400 px-2 space-y-1">
                    <p>No other words in the dictionary yet.</p>
                    <p className="text-[10px] text-slate-500">
                      Use the "Add New Word & Link" tab to add your next word.
                    </p>
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="py-5 text-center text-xs text-slate-400 px-2 space-y-1">
                    <p>No existing word matches "{searchQuery}".</p>
                    <p className="text-[10px] text-slate-500">
                      Only listed dictionary words can be selected.
                    </p>
                  </div>
                ) : (
                  filteredCandidates.map((candidate) => {
                    const isSelected = selectedWord?.id === candidate.id;
                    const existingTags = existingRelationsMap.get(candidate.id) || [];
                    const isAlreadyLinked = existingTags.length > 0;

                    return (
                      <button
                        type="button"
                        key={candidate.id}
                        id={`btn-candidate-word-${candidate.id}`}
                        onClick={() => {
                          setSelectedWord(candidate);
                          setError(null);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-sky-500/25 border border-sky-400/80 text-sky-200 font-semibold'
                            : 'hover:bg-slate-800/80 text-slate-300 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="truncate">{candidate.term}</span>
                          {isAlreadyLinked && (
                            <span className="text-[9px] px-1 py-0.2 bg-slate-800 text-slate-400 rounded border border-slate-700">
                              Linked ({existingTags.map(t => TAG_METADATA[t]?.shortCode || t).join(', ')})
                            </span>
                          )}
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* CREATE & LINK NEW WORD */
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-300">New Word Term</label>
              <div className="relative flex items-center">
                <input
                  id="input-relation-new-word-term"
                  type="text"
                  readOnly
                  value={newTerm}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData('text');
                    if (text && text.trim()) {
                      setNewTerm(text.trim());
                      setError(null);
                      setPastedNew(true);
                      setTimeout(() => setPastedNew(false), 1200);
                    }
                  }}
                  placeholder="Click paste button to paste new word..."
                  className="w-full pl-3 pr-20 py-2 bg-[#0F172A] text-slate-100 text-xs rounded-lg border border-[#334155] focus:outline-none cursor-default font-sans placeholder:text-slate-500"
                />
                <button
                  type="button"
                  id="btn-paste-new-relation-word"
                  onClick={handlePasteNewTerm}
                  className={`absolute right-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    pastedNew
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-sky-400 border border-[#334155]'
                  }`}
                >
                  {pastedNew ? (
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
          )}

          {/* Tag Types Selector */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-medium text-slate-300">Tag Type Category</label>
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
                    <span className="truncate max-w-[180px]">{meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              id="btn-submit-add-relation"
              disabled={mode === 'select_existing' ? !selectedWord : !newTerm.trim()}
              className="w-full py-2 bg-sky-400 hover:bg-sky-300 disabled:opacity-40 disabled:hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs flex items-center justify-center gap-1.5"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>
                {mode === 'select_existing'
                  ? selectedWord
                    ? `Link with "${selectedWord.term}"`
                    : 'Select a word to link'
                  : 'Add Word & Link Pair'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
