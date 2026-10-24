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
      className="fixed inset-0 z-50 bg-[#0A192F]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        id="add-word-modal-card"
        className="bg-[#112240] w-full max-w-md rounded-xl border border-[#233554] shadow-sm p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between pb-1.5 border-b border-[#233554]">
          <div className="flex items-center gap-2">
            {step !== 'input_word' && step !== 'offer_link' && (
              <button
                type="button"
                id="btn-back-to-offer"
                onClick={() => {
                  setError(null);
                  setStep('offer_link');
                }}
                className="p-1 -ml-1 text-[#94A3B8] hover:text-white cursor-pointer rounded-lg hover:bg-[#1E293B]"
                title="Back to options"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC] tracking-tight flex items-center gap-1.5">
                {step === 'input_word' ? (
                  <>
                    <Plus className="w-4 h-4 text-[#00D2FF]" />
                    <span>Add Word</span>
                  </>
                ) : step === 'offer_link' ? (
                  <>
                    <Link2 className="w-4 h-4 text-[#00D2FF]" />
                    <span>Link Word Relation</span>
                  </>
                ) : step === 'choose_existing' ? (
                  <>
                    <ListFilter className="w-4 h-4 text-[#00D2FF]" />
                    <span>Choose from Existing</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-[#00D2FF]" />
                    <span>Add & Link New Word</span>
                  </>
                )}
              </h3>
            </div>
          </div>

          <button
            id="btn-close-add-word-modal"
            onClick={handleClose}
            className="p-1.5 text-[#94A3B8] hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-[#1E293B]"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* STEP 1: INITIAL WORD INPUT */}
        {step === 'input_word' && (
          <form onSubmit={handleSubmitInitialWord} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#94A3B8]">Word Term</label>
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
                  className="w-full pl-3 pr-20 py-2.5 bg-[#080F1E] text-[#F8FAFC] text-sm rounded-lg border border-[#233554] focus:outline-none cursor-default font-sans placeholder:text-[#64748B]"
                />
                <button
                  type="button"
                  id="btn-paste-word"
                  onClick={handlePasteTerm}
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

            <button
              type="submit"
              id="btn-submit-add-word"
              disabled={!term.trim()}
              className="w-full py-2.5 bg-[#00D2FF] hover:bg-[#38BDF8] disabled:opacity-40 disabled:hover:bg-[#00D2FF] text-[#0A192F] font-semibold text-xs rounded-lg transition-all duration-200 active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed shadow-sm"
            >
              Add Word
            </button>
          </form>
        )}

        {/* STEP 2: OFFER TO LINK */}
        {step === 'offer_link' && addedWord && (
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Added Word Confirmation Banner */}
            <div className="bg-[#0A192F] border border-[#233554] rounded-lg p-3.5 text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 text-[#00D2FF] text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Word added to dictionary!</span>
              </div>
              <p className="text-base font-bold text-[#F8FAFC] tracking-wide">
                "{addedWord.term}"
              </p>
              {linkedCount > 0 && (
                <p className="text-[11px] text-emerald-400 font-medium">
                  ✓ {linkedCount} {linkedCount === 1 ? 'relation' : 'relations'} linked
                </p>
              )}
            </div>

            <div className="space-y-1 text-center">
              <p className="text-xs font-medium text-[#F8FAFC]">
                Would you like to link <span className="text-[#00D2FF] font-semibold">"{addedWord.term}"</span> with another word?
              </p>
              <p className="text-[11px] text-[#94A3B8]">
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
                className="flex flex-col items-start p-3.5 rounded-lg border border-[#233554] bg-[#0A192F] hover:border-[#00D2FF]/60 hover:bg-[#1E293B] transition-all text-left group cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                <div className="flex items-center gap-2 text-[#00D2FF] mb-1">
                  <ListFilter className="w-4 h-4" />
                  <span className="text-xs font-semibold text-[#F8FAFC] group-hover:text-[#00D2FF]">
                    Choose Existing
                  </span>
                </div>
                <p className="text-[10px] text-[#94A3B8] leading-relaxed">
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
                className="flex flex-col items-start p-3.5 rounded-lg border border-[#233554] bg-[#0A192F] hover:border-[#00D2FF]/60 hover:bg-[#1E293B] transition-all text-left group cursor-pointer shadow-xs"
              >
                <div className="flex items-center gap-2 text-[#00D2FF] mb-1">
                  <Plus className="w-4 h-4" />
                  <span className="text-xs font-semibold text-[#F8FAFC] group-hover:text-[#00D2FF]">
                    Add New Word & Link
                  </span>
                </div>
                <p className="text-[10px] text-[#94A3B8] leading-relaxed">
                  Paste a new word to add and connect as a pair.
                </p>
              </button>
            </div>

            {/* Done / Skip Action */}
            <div className="pt-2 border-t border-[#233554] flex items-center justify-end">
              <button
                type="button"
                id="btn-finish-add-word"
                onClick={handleClose}
                className="px-4 py-2 bg-[#112240] hover:bg-[#1E293B] text-[#F8FAFC] text-xs font-semibold rounded-lg border border-[#233554] transition-colors cursor-pointer"
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
              <div className="flex items-center justify-between text-[11px] font-medium text-[#94A3B8]">
                <span>Search and select an existing word:</span>
                <span className="text-[10px] text-[#94A3B8]/80">
                  {selectedWord ? `Selected: "${selectedWord.term}"` : 'None selected'}
                </span>
              </div>

              {/* Search filter input */}
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-3 text-[#94A3B8] pointer-events-none" />
                <input
                  id="input-search-existing-candidates"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search existing words in dictionary..."
                  className="w-full pl-8 pr-7 py-2 bg-[#080F1E] text-[#F8FAFC] text-xs rounded-lg border border-[#233554] focus:outline-none focus:border-[#00D2FF] focus:ring-1 focus:ring-[#00D2FF] placeholder-[#64748B] transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer p-0.5"
                    title="Clear search"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Candidate list */}
              <div
                id="existing-words-picker-list"
                className="flex-1 overflow-y-auto max-h-40 border border-[#233554] bg-[#080F1E] rounded-lg p-1.5 space-y-1"
              >
                {filteredCandidates.length === 0 ? (
                  <div className="py-5 text-center text-xs text-[#94A3B8] px-2 space-y-1">
                    <p>No existing words match "{searchQuery}".</p>
                    <p className="text-[10px] text-[#94A3B8]/70">
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
                            ? 'bg-[#00D2FF]/15 border border-[#00D2FF] text-[#00D2FF] font-semibold'
                            : 'hover:bg-[#112240] text-[#94A3B8] hover:text-[#F8FAFC] border border-transparent'
                        }`}
                      >
                        <span className="truncate">{candidate.term}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#00D2FF] shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Tag Selection */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-medium text-[#94A3B8]">Tag Type</label>
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
                          ? 'bg-[#00D2FF] text-[#0A192F] font-semibold'
                          : 'bg-[#0A192F] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#233554]'
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
                className="px-4 py-2 bg-[#112240] hover:bg-[#1E293B] text-[#F8FAFC] text-xs font-medium rounded-lg border border-[#233554] transition-all cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                id="btn-confirm-link-existing"
                disabled={!selectedWord}
                className="flex-1 py-2 px-4 bg-[#00D2FF] hover:bg-[#38BDF8] disabled:opacity-40 disabled:hover:bg-[#00D2FF] text-[#0A192F] font-semibold text-xs rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-1.5"
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
              <label className="text-[11px] font-medium text-[#94A3B8]">
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
                  className="w-full pl-3 pr-24 py-2 bg-[#080F1E] text-[#F8FAFC] text-xs rounded-lg border border-[#233554] focus:outline-none cursor-default placeholder-[#64748B]"
                />
                <button
                  type="button"
                  id="btn-paste-second-word"
                  onClick={handlePasteSecondTerm}
                  className={`absolute right-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    pastedSecond
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-[#112240] hover:bg-[#1E293B] text-[#00D2FF] border border-[#233554]'
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
              <label className="text-[11px] font-medium text-[#94A3B8]">Tag Type</label>
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
                          ? 'bg-[#00D2FF] text-[#0A192F] font-semibold'
                          : 'bg-[#0A192F] text-[#94A3B8] hover:text-[#F8FAFC] border border-[#233554]'
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
                className="px-4 py-2 bg-[#112240] hover:bg-[#1E293B] text-[#F8FAFC] text-xs font-medium rounded-lg border border-[#233554] transition-all cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                id="btn-confirm-link-another"
                disabled={!secondTerm.trim()}
                className="flex-1 py-2 px-4 bg-[#00D2FF] hover:bg-[#38BDF8] disabled:opacity-40 disabled:hover:bg-[#00D2FF] text-[#0A192F] font-semibold text-xs rounded-lg transition-all cursor-pointer disabled:cursor-not-allowed active:scale-[0.98] flex items-center justify-center gap-1.5"
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
