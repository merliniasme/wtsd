import React, { useState, useEffect, useMemo } from 'react';
import { Word, RelationTag, RELATION_TAGS, TAG_METADATA } from '../types';
import {
  X,
  Clipboard,
  Check,
  Link2,
  Search,
  Plus,
  ArrowLeft,
  ListFilter,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWord: (term: string) => { success: boolean; error?: string; word?: Word };
  onLinkWords: (
    termA: string,
    termB: string,
    tag: RelationTag
  ) => { success: boolean; duplicate?: boolean; error?: string };
  existingWords: Word[];
}

type ModalStep = 'input_word' | 'offer_link' | 'choose_existing' | 'add_another';

export const AddWordModal: React.FC<AddWordModalProps> = ({
  isOpen,
  onClose,
  onAddWord,
  onLinkWords,
  existingWords,
}) => {
  // Step Management
  const [step, setStep] = useState<ModalStep>('input_word');
  const [addedWord, setAddedWord] = useState<Word | null>(null);
  const [linkedCount, setLinkedCount] = useState(0);

  // Step 1: Input Word
  const [term, setTerm] = useState('');
  const [pasted, setPasted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sub-step: Choose Existing
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWord, setSelectedWord] = useState<Word | null>(null);

  // Sub-step: Add Another New Word
  const [secondTerm, setSecondTerm] = useState('');
  const [pastedSecond, setPastedSecond] = useState(false);

  // Shared Tag Selection for linking
  const [tag, setTag] = useState<RelationTag>('unknown');

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setStep('input_word');
      setAddedWord(null);
      setLinkedCount(0);
      setTerm('');
      setSecondTerm('');
      setSearchQuery('');
      setSelectedWord(null);
      setTag('unknown');
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Candidates for existing words picker (excluding the newly added word)
  const candidateWords = useMemo(() => {
    if (!addedWord) return existingWords;
    return existingWords.filter((w) => w.id !== addedWord.id && w.term !== addedWord.term);
  }, [existingWords, addedWord]);

  const filteredCandidates = useMemo(() => {
    const clean = searchQuery.trim().toLowerCase();
    if (!clean) return candidateWords;
    return candidateWords.filter((w) => w.term.toLowerCase().includes(clean));
  }, [candidateWords, searchQuery]);

  if (!isOpen) return null;

  const handlePasteTerm = async () => {
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
      setError('Clipboard permission required.');
    }
  };

  const handlePasteSecondTerm = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          setSecondTerm(text.trim());
          setError(null);
          setPastedSecond(true);
          setTimeout(() => setPastedSecond(false), 1200);
          return;
        }
      }
    } catch {
      setError('Clipboard permission required.');
    }
  };

  // Step 1: Submit Initial Word
  const handleSubmitInitialWord = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const clean = term.trim();
    if (!clean) {
      setError('Please paste a word first.');
    }

    const res = onAddWord(clean);
    if (!res.success) {
      setError(res.error || 'Failed to add word.');
      return;
    }

    const createdWord =
      res.word ||
      existingWords.find((w) => w.term === clean) || {
        id: 'w_' + Math.random().toString(36).substring(2, 9),
        term: clean,
        relations: [],
      };

    setAddedWord(createdWord);
    setError(null);
    setStep('offer_link');
  };

  // Submit Link from Existing Word
  const handleLinkExistingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addedWord || !selectedWord) {
      setError('Please select a word from the list.');
      return;
    }

    const res = onLinkWords(addedWord.term, selectedWord.term, tag);
    if (!res.success) {
      if (res.duplicate) {
        setError(`Relation under [${TAG_METADATA[tag].label}] already exists.`);
      } else {
        setError(res.error || 'Failed to link words.');
      }
      return;
    }

    setLinkedCount((prev) => prev + 1);
    setSelectedWord(null);
    setSearchQuery('');
    setError(null);
    setStep('offer_link');
  };

  // Submit Link by Adding Another Word
  const handleLinkAnotherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addedWord) return;

    const cleanSecond = secondTerm.trim();
    if (!cleanSecond) {
      setError('Please enter or paste a word.');
      return;
    }

    if (cleanSecond === addedWord.term) {
      setError('Cannot link a word to itself.');
      return;
    }

    const res = onLinkWords(addedWord.term, cleanSecond, tag);
    if (!res.success) {
      if (res.duplicate) {
        setError(`Relation under [${TAG_METADATA[tag].label}] already exists.`);
      } else {
        setError(res.error || 'Failed to link words.');
      }
      return;
    }

    setLinkedCount((prev) => prev + 1);
    setSecondTerm('');
    setError(null);
    setStep('offer_link');
  };

  const handleClose = () => {
    setStep('input_word');
    setAddedWord(null);
    setTerm('');
    setSecondTerm('');
    setSearchQuery('');
    setSelectedWord(null);
    setError(null);
    onClose();
  };

  return (
    <div
      id="add-word-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        id="add-word-modal-card"
        className="bg-[#1E293B] w-full max-w-md rounded-xl border border-[#334155] shadow-2xl p-4.5 space-y-4 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-1 border-b border-[#334155]/60">
          <div className="flex items-center gap-2">
            {step !== 'input_word' && step !== 'offer_link' && (
              <button
                type="button"
                id="btn-back-to-offer"
                onClick={() => {
                  setError(null);
                  setStep('offer_link');
                }}
                className="p-1 -ml-1 text-slate-400 hover:text-slate-200 cursor-pointer rounded hover:bg-slate-800"
                title="Back to options"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                {step === 'input_word' ? (
                  <>
                    <Plus className="w-4 h-4 text-sky-400" />
                    <span>Add Word</span>
                  </>
                ) : step === 'offer_link' ? (
                  <>
                    <Link2 className="w-4 h-4 text-sky-400" />
                    <span>Link Word Relation</span>
                  </>
                ) : step === 'choose_existing' ? (
                  <>
                    <ListFilter className="w-4 h-4 text-sky-400" />
                    <span>Choose from Existing</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-sky-400" />
                    <span>Add & Link New Word</span>
                  </>
                )}
              </h3>
            </div>
          </div>

          <button
            id="btn-close-add-word-modal"
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer rounded hover:bg-slate-800"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <p className="text-xs text-rose-300 bg-rose-950/50 border border-rose-800/60 rounded px-2.5 py-1.5">
            {error}
          </p>
        )}

        {/* STEP 1: INITIAL WORD INPUT */}
        {step === 'input_word' && (
          <form onSubmit={handleSubmitInitialWord} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">Word Term</label>
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
                  onClick={handlePasteTerm}
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

            <button
              type="submit"
              id="btn-submit-add-word"
              disabled={!term.trim()}
              className="w-full py-2 bg-sky-400 hover:bg-sky-300 disabled:opacity-40 disabled:hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs"
            >
              Add Word
            </button>
          </form>
        )}

        {/* STEP 2: OFFER TO LINK */}
        {step === 'offer_link' && addedWord && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Added Word Confirmation Banner */}
            <div className="bg-sky-950/40 border border-sky-800/60 rounded-lg p-3 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-sky-300 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Word added to dictionary!</span>
              </div>
              <p className="text-base font-bold text-slate-100 tracking-wide">
                "{addedWord.term}"
              </p>
              {linkedCount > 0 && (
                <p className="text-[11px] text-emerald-400 font-medium">
                  ✓ {linkedCount} {linkedCount === 1 ? 'relation' : 'relations'} linked
                </p>
              )}
            </div>

            <div className="space-y-1 text-center">
              <p className="text-xs font-medium text-slate-200">
                Would you like to link <span className="text-sky-300 font-semibold">"{addedWord.term}"</span> with another word?
              </p>
              <p className="text-[11px] text-slate-400">
                Choose an option below or finish.
              </p>
            </div>

            {/* Option Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* Option 1: Choose from Existing */}
              <button
                type="button"
                id="btn-offer-choose-existing"
                onClick={() => {
                  setError(null);
                  setStep('choose_existing');
                }}
                disabled={candidateWords.length === 0}
                className="flex flex-col items-start p-3 rounded-lg border border-[#334155] bg-[#0F172A] hover:border-sky-400/80 hover:bg-slate-800/60 transition-all text-left group cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2 text-sky-400 mb-1">
                  <ListFilter className="w-4 h-4" />
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-sky-300">
                    Choose Existing
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  {candidateWords.length > 0
                    ? `Pick from ${candidateWords.length} existing dictionary words.`
                    : 'No other words in dictionary yet.'}
                </p>
              </button>

              {/* Option 2: Add Another Word */}
              <button
                type="button"
                id="btn-offer-add-another"
                onClick={() => {
                  setError(null);
                  setStep('add_another');
                }}
                className="flex flex-col items-start p-3 rounded-lg border border-[#334155] bg-[#0F172A] hover:border-sky-400/80 hover:bg-slate-800/60 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center gap-2 text-sky-400 mb-1">
                  <Plus className="w-4 h-4" />
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-sky-300">
                    Add New Word & Link
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Paste a new word to add and connect as a pair.
                </p>
              </button>
            </div>

            {/* Done / Skip Action */}
            <div className="pt-2 border-t border-[#334155]/60 flex items-center justify-end">
              <button
                type="button"
                id="btn-finish-add-word"
                onClick={handleClose}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-[#334155] transition-colors cursor-pointer"
              >
                {linkedCount > 0 ? 'Done' : 'Skip & Finish'}
              </button>
            </div>
          </div>
        )}

        {/* SUB-STEP A: CHOOSE FROM EXISTING WORDS */}
        {step === 'choose_existing' && addedWord && (
          <form onSubmit={handleLinkExistingSubmit} className="space-y-3.5 overflow-hidden flex flex-col flex-1">
            <div className="space-y-2 flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-300">
                <span>Search and select an existing word:</span>
                <span className="text-[10px] text-slate-400">
                  {selectedWord ? `Selected: "${selectedWord.term}"` : 'None selected'}
                </span>
              </div>

              {/* Search filter input */}
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
                <input
                  id="input-search-existing-candidates"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search existing words in dictionary..."
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

              {/* Candidate list */}
              <div
                id="existing-words-picker-list"
                className="flex-1 overflow-y-auto max-h-40 border border-[#334155] bg-[#0F172A] rounded-lg p-1.5 space-y-1"
              >
                {filteredCandidates.length === 0 ? (
                  <div className="py-5 text-center text-xs text-slate-400 px-2 space-y-1">
                    <p>No existing words match "{searchQuery}".</p>
                    <p className="text-[10px] text-slate-500">
                      Only words already in your dictionary can be chosen.
                    </p>
                  </div>
                ) : (
                  filteredCandidates.map((candidate) => {
                    const isSelected = selectedWord?.id === candidate.id;
                    return (
                      <button
                        type="button"
                        key={candidate.id}
                        id={`btn-select-existing-${candidate.id}`}
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
                        <span className="truncate">{candidate.term}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Tag Selection */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-medium text-slate-300">Tag Type</label>
              <div className="flex flex-wrap gap-1.5">
                {RELATION_TAGS.map((t) => {
                  const meta = TAG_METADATA[t];
                  const isSelected = tag === t;
                  return (
                    <button
                      type="button"
                      key={t}
                      id={`btn-choose-existing-tag-${t}`}
                      onClick={() => setTag(t)}
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

            {/* Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep('offer_link')}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-[#334155] cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                id="btn-confirm-link-existing"
                disabled={!selectedWord}
                className="flex-1 py-2 bg-sky-400 hover:bg-sky-300 disabled:opacity-40 disabled:hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs flex items-center justify-center gap-1.5"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>
                  {selectedWord
                    ? `Link with "${selectedWord.term}"`
                    : 'Select a word from list'}
                </span>
              </button>
            </div>
          </form>
        )}

        {/* SUB-STEP B: ADD ANOTHER NEW WORD AND LINK */}
        {step === 'add_another' && addedWord && (
          <form onSubmit={handleLinkAnotherSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">
                New Counterpart Word (to link with "{addedWord.term}")
              </label>
              <div className="relative flex items-center">
                <input
                  id="input-second-word-term"
                  type="text"
                  readOnly
                  value={secondTerm}
                  onPaste={(e) => {
                    const pastedText = e.clipboardData.getData('text');
                    if (pastedText && pastedText.trim()) {
                      setSecondTerm(pastedText.trim());
                      setError(null);
                      setPastedSecond(true);
                      setTimeout(() => setPastedSecond(false), 1200);
                    }
                  }}
                  placeholder="Click paste button..."
                  className="w-full pl-3 pr-20 py-2 bg-[#0F172A] text-slate-100 text-xs rounded-lg border border-[#334155] focus:outline-none cursor-default font-sans placeholder:text-slate-500"
                />
                <button
                  type="button"
                  id="btn-paste-second-word"
                  onClick={handlePasteSecondTerm}
                  className={`absolute right-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    pastedSecond
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 hover:bg-slate-700 text-sky-400 border border-[#334155]'
                  }`}
                >
                  {pastedSecond ? (
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

            {/* Tag Selection */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-medium text-slate-300">Tag Type</label>
              <div className="flex flex-wrap gap-1.5">
                {RELATION_TAGS.map((t) => {
                  const meta = TAG_METADATA[t];
                  const isSelected = tag === t;
                  return (
                    <button
                      type="button"
                      key={t}
                      id={`btn-add-another-tag-${t}`}
                      onClick={() => setTag(t)}
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

            {/* Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep('offer_link')}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-[#334155] cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                id="btn-confirm-link-another"
                disabled={!secondTerm.trim()}
                className="flex-1 py-2 bg-sky-400 hover:bg-sky-300 disabled:opacity-40 disabled:hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed shadow-xs flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add & Link Pair</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
