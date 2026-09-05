import React, { useState, useMemo, useCallback, useDeferredValue, useEffect } from 'react';
import { Word, RelationTag, ToastMessage, ActiveTab, PairItem } from './types';
import {
  extractAllPairs,
  addOrLinkPair,
  unlinkWords,
  updateRelationTag,
  deleteWord,
  updateWordTerm,
  getOrCreateWord,
  fastStringCompare,
} from './utils/wordGraph';
import { useGoogleDriveSync } from './hooks/useGoogleDriveSync';

import { Header } from './components/Header';
import { LandingView } from './components/LandingView';
import { TabsNav } from './components/TabsNav';
import { SearchBar } from './components/SearchBar';
import { PairCard } from './components/PairCard';
import { WordCard } from './components/WordCard';
import { NoResultsState } from './components/NoResultsState';
import { SettingsView } from './components/SettingsView';
import { FloatingAddButton } from './components/FloatingAddButton';
import { AddWordModal } from './components/AddWordModal';
import { CreateRelationModal } from './components/CreateRelationModal';
import { AddRelationModal } from './components/AddRelationModal';
import { EditRelationModal } from './components/EditRelationModal';
import { EditWordModal } from './components/EditWordModal';
import { RawImportModal } from './components/RawImportModal';
import { MemoryGameModal } from './components/MemoryGameModal';
import { AntiCensorModal } from './components/AntiCensorModal';
import { ToastContainer } from './components/Toast';
import { Plus, Settings as SettingsIcon, Link2, FileUp, ChevronDown, VenetianMask } from 'lucide-react';

const INITIAL_PAGE_SIZE = 40;
const PAGE_INCREMENT = 40;

export default function App() {
  // In-memory words state (synced with Google Drive)
  const [words, setWords] = useState<Word[]>([]);

  // Active Tab: 'pairs' | 'words' | 'settings'
  const [activeTab, setActiveTab] = useState<ActiveTab>('pairs');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [selectedTag, setSelectedTag] = useState<RelationTag | 'all'>('all');

  // Progressive Display Pagination
  const [visiblePairsCount, setVisiblePairsCount] = useState<number>(INITIAL_PAGE_SIZE);
  const [visibleWordsCount, setVisibleWordsCount] = useState<number>(INITIAL_PAGE_SIZE);

  // Modal States
  const [isAddWordOpen, setIsAddWordOpen] = useState(false);
  const [isCreateRelationOpen, setIsCreateRelationOpen] = useState(false);
  const [isRawImportOpen, setIsRawImportOpen] = useState(false);
  const [isMemoryGameOpen, setIsMemoryGameOpen] = useState(false);
  const [isAntiCensorOpen, setIsAntiCensorOpen] = useState(false);
  const [antiCensorWord, setAntiCensorWord] = useState('');
  const [activeWordForRelation, setActiveWordForRelation] = useState<Word | null>(null);
  const [wordToEdit, setWordToEdit] = useState<Word | null>(null);
  const [relationToEdit, setRelationToEdit] = useState<{
    wordA: Word;
    wordB: Word;
    currentTag: RelationTag;
  } | null>(null);

  // Toast Notifications State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Google Drive Sync Engine & Master Database
  const driveSync = useGoogleDriveSync({
    words,
    setWords,
    addToast,
  });

  // Fast Word Lookup Map (O(1) lookups)
  const wordsMap = useMemo(() => {
    const map = new Map<string, Word>();
    for (let i = 0; i < words.length; i++) {
      map.set(words[i].id, words[i]);
    }
    return map;
  }, [words]);

  // All Pairs Extraction (Optimized graph traversal)
  const allPairs = useMemo(() => {
    return extractAllPairs(words);
  }, [words]);

  // Fast Pre-lowercased Pair Search Index
  const pairSearchIndex = useMemo(() => {
    return allPairs.map((p) => ({
      pair: p,
      termALower: p.wordA.term.toLowerCase(),
      termBLower: p.wordB.term.toLowerCase(),
      tag: p.tag,
    }));
  }, [allPairs]);

  // Filtered Pairs based on search and tag (Non-blocking & Instant)
  const filteredPairs = useMemo(() => {
    const cleanSearch = deferredSearchTerm.trim().toLowerCase();

    if (!cleanSearch && selectedTag === 'all') {
      return allPairs;
    }

    const results: PairItem[] = [];
    for (let i = 0; i < pairSearchIndex.length; i++) {
      const item = pairSearchIndex[i];
      if (selectedTag !== 'all' && item.tag !== selectedTag) {
        continue;
      }
      if (
        cleanSearch &&
        !item.termALower.includes(cleanSearch) &&
        !item.termBLower.includes(cleanSearch)
      ) {
        continue;
      }
      results.push(item.pair);
    }
    return results;
  }, [allPairs, pairSearchIndex, deferredSearchTerm, selectedTag]);

  // Fast Pre-lowercased Word Search Index
  const wordSearchIndex = useMemo(() => {
    return words.map((w) => {
      const targetTermsLower: string[] = [];
      for (let i = 0; i < w.relations.length; i++) {
        const target = wordsMap.get(w.relations[i].targetWordId);
        if (target) {
          targetTermsLower.push(target.term.toLowerCase());
        }
      }
      return {
        word: w,
        termLower: w.term.toLowerCase(),
        targetTermsLower,
      };
    });
  }, [words, wordsMap]);

  // Filtered Words based on search (Instant & Non-blocking)
  const filteredWords = useMemo(() => {
    const cleanSearch = deferredSearchTerm.trim().toLowerCase();

    if (!cleanSearch) {
      return words;
    }

    const results: Word[] = [];
    for (let i = 0; i < wordSearchIndex.length; i++) {
      const item = wordSearchIndex[i];
      if (item.termLower.includes(cleanSearch)) {
        results.push(item.word);
        continue;
      }

      let hasTargetMatch = false;
      for (let j = 0; j < item.targetTermsLower.length; j++) {
        if (item.targetTermsLower[j].includes(cleanSearch)) {
          hasTargetMatch = true;
          break;
        }
      }

      if (hasTargetMatch) {
        results.push(item.word);
      }
    }

    // Fast sort with relation density and reusable collator
    return results.sort((a, b) => {
      if (b.relations.length !== a.relations.length) {
        return b.relations.length - a.relations.length;
      }
      return fastStringCompare(a.term, b.term);
    });
  }, [words, wordSearchIndex, deferredSearchTerm]);

  // Reset pagination when search query or filter tags change
  useEffect(() => {
    setVisiblePairsCount(INITIAL_PAGE_SIZE);
  }, [deferredSearchTerm, selectedTag, activeTab]);

  useEffect(() => {
    setVisibleWordsCount(INITIAL_PAGE_SIZE);
  }, [deferredSearchTerm, activeTab]);

  // Windowed display subsets (Ensures 60fps rendering without DOM node explosion)
  const displayedPairs = useMemo(() => {
    return filteredPairs.slice(0, visiblePairsCount);
  }, [filteredPairs, visiblePairsCount]);

  const displayedWords = useMemo(() => {
    return filteredWords.slice(0, visibleWordsCount);
  }, [filteredWords, visibleWordsCount]);

  // Memoized card interaction callbacks
  const handleSelectWord = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleEditPairRelationTag = useCallback(
    (wordA: PairItem['wordA'], wordB: PairItem['wordB'], currentTag: RelationTag) => {
      setRelationToEdit({ wordA, wordB, currentTag });
    },
    []
  );

  const handleEditWordRelationTag = useCallback(
    (word: Word, targetWord: Word, currentTag: RelationTag) => {
      setRelationToEdit({ wordA: word, wordB: targetWord, currentTag });
    },
    []
  );

  const handleCopyToast = useCallback(
    (text: string) => {
      addToast(`Copied "${text}"`, 'info');
    },
    [addToast]
  );

  const handleCopyAntiCensorToast = useCallback(
    (original: string, transformed: string) => {
      addToast(`Disalin Anti-Sensor (Sirilik): "${transformed}"`, 'success');
    },
    [addToast]
  );

  const handleOpenAntiCensor = useCallback((word?: string) => {
    setAntiCensorWord(word || '');
    setIsAntiCensorOpen(true);
  }, []);

  // Handler: Add Standalone Word
  const handleAddSingleWord = useCallback(
    (term: string) => {
      const clean = term.trim();
      if (!clean) {
        return { success: false, error: 'Word cannot be empty.' };
      }

      const res = getOrCreateWord(words, clean);
      if (!res.created) {
        return { success: true, word: res.word };
      }

      setWords(res.updatedWords);
      addToast(`Added "${clean}".`, 'success');
      return { success: true, word: res.word };
    },
    [words, addToast]
  );

  // Handler: Create Mutual Relation / Pair
  const handleCreateRelation = useCallback(
    (termA: string, termB: string, tag: RelationTag) => {
      const res = addOrLinkPair(words, termA, termB, tag);
      if (res.duplicate) {
        return { success: false, duplicate: true };
      }

      setWords(res.updatedWords);
      addToast(`Connected "${res.wordA.term}" ⇄ "${res.wordB.term}".`, 'success');
      return { success: true };
    },
    [words, addToast]
  );

  // Handler: Add Relation to an Existing Word Card
  const handleAddRelationToExisting = useCallback(
    (sourceWordId: string, targetTerm: string, tag: RelationTag) => {
      const sourceWord = wordsMap.get(sourceWordId);
      if (!sourceWord) return { success: false, error: 'Word not found.' };

      const res = addOrLinkPair(words, sourceWord.term, targetTerm, tag);
      if (res.duplicate) {
        return { success: false, duplicate: true };
      }

      setWords(res.updatedWords);
      addToast(`Linked "${sourceWord.term}" ⇄ "${res.wordB.term}".`, 'success');
      return { success: true };
    },
    [words, wordsMap, addToast]
  );

  // Handler: Unlink relation
  const handleUnlinkRelation = useCallback(
    (wordAId: string, wordBId: string, tag: RelationTag) => {
      const wordA = wordsMap.get(wordAId);
      const wordB = wordsMap.get(wordBId);
      const updated = unlinkWords(words, wordAId, wordBId, tag);
      setWords(updated);
      addToast(
        `Removed link between "${wordA?.term || 'Word'}" and "${wordB?.term || 'Word'}".`,
        'info'
      );
    },
    [words, wordsMap, addToast]
  );

  // Handler: Update relation tag
  const handleSaveRelationTag = useCallback(
    (wordAId: string, wordBId: string, oldTag: RelationTag, newTag: RelationTag) => {
      const updated = updateRelationTag(words, wordAId, wordBId, oldTag, newTag);
      setWords(updated);
      addToast(`Updated tag type.`, 'success');
    },
    [words, addToast]
  );

  // Handler: Delete Word
  const handleDeleteWord = useCallback(
    (wordId: string) => {
      const target = wordsMap.get(wordId);
      if (!target) return;

      const updated = deleteWord(words, wordId);
      setWords(updated);
      addToast(`Deleted "${target.term}".`, 'info');
    },
    [words, wordsMap, addToast]
  );

  // Handler: Edit Word Term
  const handleEditWordTerm = useCallback(
    (wordId: string, newTerm: string) => {
      const target = wordsMap.get(wordId);
      if (!target) return { success: false, error: 'Word not found.' };

      const cleanNew = newTerm.trim();
      if (!cleanNew) return { success: false, error: 'Word cannot be empty.' };

      for (let i = 0; i < words.length; i++) {
        if (words[i].id !== wordId && words[i].term === cleanNew) {
          return { success: false, error: `Word "${cleanNew}" already exists.` };
        }
      }

      const updated = updateWordTerm(words, wordId, cleanNew);
      setWords(updated);
      addToast(`Updated to "${cleanNew}".`, 'success');
      return { success: true };
    },
    [words, addToast]
  );

  const isSearchEmpty = !searchTerm.trim();

  // If user is not signed in, show the forced sign-in landing page
  if (!driveSync.user) {
    return (
      <LandingView
        onSignIn={driveSync.signIn}
        isSigningIn={driveSync.isSigningIn}
        isAuthLoading={driveSync.isAuthLoading}
        isTokenExpired={driveSync.isTokenExpired}
        lastError={driveSync.lastError}
      />
    );
  }

  return (
    <div
      id="app-root-container"
      className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-sky-200"
    >
      {/* Dynamic Header with Sync & Account State */}
      <Header
        user={driveSync.user}
        syncStatus={driveSync.syncStatus}
        isOperating={driveSync.isOperating}
        isSigningIn={driveSync.isSigningIn}
        lastSyncedAt={driveSync.lastSyncedAt}
        onSignIn={driveSync.signIn}
        onSync={driveSync.syncNow}
        onGoToSettings={() => setActiveTab('settings')}
        onOpenAntiCensor={() => handleOpenAntiCensor()}
      />

      {/* Main Content Area */}
      <main id="app-main-content" className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Navigation Tabs Bar & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          <div className="flex items-center gap-2">
            <button
              id="btn-open-anticensor-top"
              type="button"
              onClick={() => handleOpenAntiCensor()}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              title="Buka Alat Anti-Sensor Homoglif (Sirilik Rusia)"
            >
              <VenetianMask className="w-3.5 h-3.5 text-amber-400" />
              <span>Anti-Sensor</span>
            </button>

            <button
              id="btn-open-raw-import-top"
              type="button"
              onClick={() => setIsRawImportOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#1E293B] hover:bg-slate-700 text-slate-300 hover:text-white border border-[#334155] text-xs font-medium rounded-lg transition-colors cursor-pointer"
              title="Import plain text dictionary rules ([Word1] # [Word2] & [Word3])"
            >
              <FileUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Raw Import</span>
            </button>

            <button
              id="btn-open-add-word-top"
              type="button"
              onClick={() => setIsAddWordOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Word</span>
            </button>
          </div>
        </div>

        {/* Tab 3: Settings View */}
        {activeTab === 'settings' ? (
          <SettingsView
            words={words}
            onUpdateWords={setWords}
            onToast={addToast}
            user={driveSync.user}
            syncStatus={driveSync.syncStatus}
            lastSyncedAt={driveSync.lastSyncedAt}
            cloudFileInfo={driveSync.cloudFileInfo}
            cloudWordCount={driveSync.cloudWordCount}
            isSigningIn={driveSync.isSigningIn}
            isOperating={driveSync.isOperating}
            onSignIn={driveSync.signIn}
            onSignOut={driveSync.signOut}
            onSyncNow={driveSync.syncNow}
            onClearCloudDatabase={driveSync.clearCloudDatabase}
            onOpenRawImport={() => setIsRawImportOpen(true)}
            onOpenAntiCensor={() => handleOpenAntiCensor()}
          />
        ) : (
          <>
            {/* Minimal Search & Filter */}
            <SearchBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedTag={selectedTag}
              onTagSelect={setSelectedTag}
              activeTab={activeTab}
            />

            {/* State Renderers */}
            {words.length === 0 ? (
              <div
                id="empty-dictionary-state"
                className="text-center py-20 px-4 max-w-sm mx-auto space-y-3 animate-in fade-in duration-150"
              >
                <div className="w-10 h-10 rounded-full bg-[#1E293B] border border-[#334155] text-slate-400 mx-auto flex items-center justify-center">
                  <Plus className="w-5 h-5 text-sky-400" />
                </div>
                <h3 className="font-semibold text-slate-200 text-sm">Dictionary is empty (0 words)</h3>
                <p className="text-xs text-slate-400">
                  Get started by adding your first word pair, or import plain text rules.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    id="btn-empty-state-add-word"
                    onClick={() => setIsAddWordOpen(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-semibold rounded-md transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Word</span>
                  </button>
                  <button
                    id="btn-empty-state-raw-import"
                    onClick={() => setIsRawImportOpen(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1E293B] hover:bg-slate-700 text-slate-200 border border-[#334155] text-xs font-medium rounded-md transition-colors cursor-pointer"
                  >
                    <FileUp className="w-3.5 h-3.5 text-sky-400" />
                    <span>Raw Import</span>
                  </button>
                  <button
                    id="btn-empty-state-go-settings"
                    onClick={() => setActiveTab('settings')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-[#334155] text-xs font-medium rounded-md transition-colors cursor-pointer"
                  >
                    <SettingsIcon className="w-3.5 h-3.5 text-sky-400" />
                    <span>Drive & Settings</span>
                  </button>
                </div>
              </div>
            ) : activeTab === 'pairs' ? (
              /* PAIRS TAB VIEW */
              allPairs.length === 0 ? (
                <div
                  id="no-pairs-linked-state"
                  className="text-center py-16 px-4 max-w-sm mx-auto space-y-3 animate-in fade-in duration-150"
                >
                  <div className="w-10 h-10 rounded-full bg-[#1E293B] border border-[#334155] text-slate-400 mx-auto flex items-center justify-center">
                    <Link2 className="w-4 h-4 text-sky-400" />
                  </div>
                  <h3 className="font-semibold text-slate-200 text-sm">No word pairs linked yet</h3>
                  <p className="text-xs text-slate-400">
                    Connect two words together by clicking Add Word or linking words from the Words tab.
                  </p>
                  <div className="pt-1">
                    <button
                      id="btn-pairs-empty-add-word"
                      onClick={() => setIsAddWordOpen(true)}
                      className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-semibold rounded-md transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Word / Pair</span>
                    </button>
                  </div>
                </div>
              ) : displayedPairs.length === 0 ? (
                <NoResultsState
                  searchTerm={searchTerm}
                  selectedTag={selectedTag}
                  activeTab="pairs"
                  onClearFilters={() => {
                    setSearchTerm('');
                    setSelectedTag('all');
                  }}
                  onAddWithTerm={() => {
                    setIsAddWordOpen(true);
                  }}
                />
              ) : (
                <section id="pairs-list-section" className="space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span>
                      {filteredPairs.length > displayedPairs.length ? (
                        <>
                          Showing <strong className="text-slate-200">{displayedPairs.length}</strong> of{' '}
                          <strong className="text-slate-200">{filteredPairs.length}</strong> pairs
                        </>
                      ) : (
                        <>
                          <strong className="text-slate-200">{filteredPairs.length}</strong>{' '}
                          {filteredPairs.length === 1 ? 'pair' : 'pairs'}
                          {!isSearchEmpty && ' found'}
                        </>
                      )}
                    </span>
                    {(searchTerm || selectedTag !== 'all') && (
                      <button
                        id="btn-reset-pairs-filters"
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedTag('all');
                        }}
                        className="text-sky-400 hover:underline cursor-pointer text-xs"
                      >
                        Clear filter
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {displayedPairs.map((pair) => (
                      <PairCard
                        key={pair.id}
                        pair={pair}
                        onSelectWord={handleSelectWord}
                        onEditRelationTag={handleEditPairRelationTag}
                        onUnlinkRelation={handleUnlinkRelation}
                        onCopyText={handleCopyToast}
                        onCopyAntiCensor={handleCopyAntiCensorToast}
                      />
                    ))}
                  </div>

                  {/* Load More Pagination Trigger */}
                  {filteredPairs.length > displayedPairs.length && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-3 pb-2">
                      <button
                        id="btn-load-more-pairs"
                        type="button"
                        onClick={() => setVisiblePairsCount((prev) => prev + PAGE_INCREMENT)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1E293B] hover:bg-slate-700 text-slate-200 hover:text-white border border-[#334155] rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-sky-400" />
                        <span>Load More Pairs (+{PAGE_INCREMENT})</span>
                      </button>
                      {filteredPairs.length > displayedPairs.length + PAGE_INCREMENT && (
                        <button
                          id="btn-show-all-pairs"
                          type="button"
                          onClick={() => setVisiblePairsCount(filteredPairs.length)}
                          className="text-xs text-slate-400 hover:text-slate-200 px-3 py-2 transition-colors cursor-pointer"
                        >
                          Show All ({filteredPairs.length})
                        </button>
                      )}
                    </div>
                  )}
                </section>
              )
            ) : (
              /* WORDS TAB VIEW */
              displayedWords.length === 0 ? (
                <NoResultsState
                  searchTerm={searchTerm}
                  selectedTag={selectedTag}
                  activeTab="words"
                  onClearFilters={() => {
                    setSearchTerm('');
                  }}
                  onAddWithTerm={() => {
                    setIsAddWordOpen(true);
                  }}
                />
              ) : (
                <section id="words-list-section" className="space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span>
                      {filteredWords.length > displayedWords.length ? (
                        <>
                          Showing <strong className="text-slate-200">{displayedWords.length}</strong> of{' '}
                          <strong className="text-slate-200">{filteredWords.length}</strong> words
                        </>
                      ) : (
                        <>
                          <strong className="text-slate-200">{filteredWords.length}</strong>{' '}
                          {filteredWords.length === 1 ? 'word' : 'words'}
                          {!isSearchEmpty && ' found'}
                        </>
                      )}
                    </span>
                    {searchTerm && (
                      <button
                        id="btn-reset-words-filters"
                        onClick={() => {
                          setSearchTerm('');
                        }}
                        className="text-sky-400 hover:underline cursor-pointer text-xs"
                      >
                        Clear search
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {displayedWords.map((word) => (
                      <WordCard
                        key={word.id}
                        word={word}
                        allWordsMap={wordsMap}
                        onSelectWord={handleSelectWord}
                        onAddRelationToWord={(w) => setActiveWordForRelation(w)}
                        onEditWord={(w) => setWordToEdit(w)}
                        onDeleteWord={handleDeleteWord}
                        onEditRelationTag={handleEditWordRelationTag}
                        onUnlinkRelation={handleUnlinkRelation}
                        onCopyTerm={handleCopyToast}
                        onCopyAntiCensor={handleCopyAntiCensorToast}
                        onOpenAntiCensor={handleOpenAntiCensor}
                        highlightTerm={searchTerm}
                      />
                    ))}
                  </div>

                  {/* Load More Pagination Trigger */}
                  {filteredWords.length > displayedWords.length && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-3 pb-2">
                      <button
                        id="btn-load-more-words"
                        type="button"
                        onClick={() => setVisibleWordsCount((prev) => prev + PAGE_INCREMENT)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1E293B] hover:bg-slate-700 text-slate-200 hover:text-white border border-[#334155] rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                      >
                        <ChevronDown className="w-3.5 h-3.5 text-sky-400" />
                        <span>Load More Words (+{PAGE_INCREMENT})</span>
                      </button>
                      {filteredWords.length > displayedWords.length + PAGE_INCREMENT && (
                        <button
                          id="btn-show-all-words"
                          type="button"
                          onClick={() => setVisibleWordsCount(filteredWords.length)}
                          className="text-xs text-slate-400 hover:text-slate-200 px-3 py-2 transition-colors cursor-pointer"
                        >
                          Show All ({filteredWords.length})
                        </button>
                      )}
                    </div>
                  )}
                </section>
              )
            )}
          </>
        )}
      </main>

      {/* Floating Action Buttons (Puzzle Game & Add Word) */}
      <FloatingAddButton
        onAddWord={() => setIsAddWordOpen(true)}
        onOpenPuzzle={() => setIsMemoryGameOpen(true)}
      />

      {/* Add Word Modal */}
      <AddWordModal
        isOpen={isAddWordOpen}
        onClose={() => setIsAddWordOpen(false)}
        onAddWord={handleAddSingleWord}
        onLinkWords={handleCreateRelation}
        existingWords={words}
      />

      {/* Create Mutual Relation Modal */}
      <CreateRelationModal
        isOpen={isCreateRelationOpen}
        onClose={() => setIsCreateRelationOpen(false)}
        onAddRelation={handleCreateRelation}
        existingWords={words}
      />

      {/* Link Existing Word Modal */}
      <AddRelationModal
        sourceWord={activeWordForRelation}
        isOpen={!!activeWordForRelation}
        onClose={() => setActiveWordForRelation(null)}
        onAddRelation={handleAddRelationToExisting}
        allWords={words}
      />

      {/* Edit Relation Category Tag Modal */}
      <EditRelationModal
        isOpen={!!relationToEdit}
        onClose={() => setRelationToEdit(null)}
        wordA={relationToEdit?.wordA || null}
        wordB={relationToEdit?.wordB || null}
        currentTag={relationToEdit?.currentTag || null}
        onSaveTag={handleSaveRelationTag}
      />

      {/* Edit Word Modal */}
      <EditWordModal
        isOpen={!!wordToEdit}
        onClose={() => setWordToEdit(null)}
        word={wordToEdit}
        onSaveTerm={handleEditWordTerm}
      />

      {/* Raw Plain Text Importer Modal */}
      <RawImportModal
        isOpen={isRawImportOpen}
        onClose={() => setIsRawImportOpen(false)}
        existingWords={words}
        onImportComplete={(newWords, msg) => {
          setWords(newWords);
          addToast(msg, 'success');
        }}
      />

      {/* Memory Puzzle Game Modal */}
      <MemoryGameModal
        isOpen={isMemoryGameOpen}
        onClose={() => setIsMemoryGameOpen(false)}
        words={words}
      />

      {/* Anti-Censor Homoglyph Modal */}
      <AntiCensorModal
        isOpen={isAntiCensorOpen}
        onClose={() => setIsAntiCensorOpen(false)}
        initialWord={antiCensorWord}
        words={words}
        onNotify={addToast}
      />

      {/* Minimal Toast Feedback Alerts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
