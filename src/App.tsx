import React, { useState, useMemo, useCallback } from 'react';
import { Word, RelationTag, ToastMessage, ActiveTab } from './types';
import {
  extractAllPairs,
  addOrLinkPair,
  unlinkWords,
  updateRelationTag,
  deleteWord,
  updateWordTerm,
  getOrCreateWord,
} from './utils/wordGraph';
import { useGoogleDriveSync } from './hooks/useGoogleDriveSync';

import { Header } from './components/Header';
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
import { ToastContainer } from './components/Toast';
import { Plus, Settings as SettingsIcon, Link2 } from 'lucide-react';

export default function App() {
  // In-memory words state (synced with Google Drive)
  const [words, setWords] = useState<Word[]>([]);

  // Active Tab: 'pairs' | 'words' | 'settings'
  const [activeTab, setActiveTab] = useState<ActiveTab>('pairs');

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<RelationTag | 'all'>('all');

  // Modal States
  const [isAddWordOpen, setIsAddWordOpen] = useState(false);
  const [isCreateRelationOpen, setIsCreateRelationOpen] = useState(false);
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

  // Fast Word Lookup Map
  const wordsMap = useMemo(() => {
    return new Map<string, Word>(words.map((w) => [w.id, w]));
  }, [words]);

  // All Pairs Extraction
  const allPairs = useMemo(() => {
    return extractAllPairs(words);
  }, [words]);

  // Filtered Pairs based on search and tag
  const filteredPairs = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();

    return allPairs.filter((pair) => {
      // Tag filter
      if (selectedTag !== 'all' && pair.tag !== selectedTag) {
        return false;
      }

      // Search filter
      if (!cleanSearch) return true;

      return (
        pair.wordA.term.toLowerCase().includes(cleanSearch) ||
        pair.wordB.term.toLowerCase().includes(cleanSearch)
      );
    });
  }, [allPairs, searchTerm, selectedTag]);

  // When search bar is empty, show max 10 pairs
  const displayedPairs = useMemo(() => {
    if (!searchTerm.trim()) {
      return filteredPairs.slice(0, 10);
    }
    return filteredPairs;
  }, [filteredPairs, searchTerm]);

  // Filtered Words based on search
  const filteredWords = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();

    return words
      .filter((word) => {
        if (!cleanSearch) return true;

        if (word.term.toLowerCase().includes(cleanSearch)) {
          return true;
        }

        const hasTargetMatch = word.relations.some((r) => {
          const target = wordsMap.get(r.targetWordId);
          return target && target.term.toLowerCase().includes(cleanSearch);
        });

        return hasTargetMatch;
      })
      .sort((a, b) => {
        if (b.relations.length !== a.relations.length) {
          return b.relations.length - a.relations.length;
        }
        return a.term.localeCompare(b.term);
      });
  }, [words, searchTerm, wordsMap]);

  // When search bar is empty, show max 10 words
  const displayedWords = useMemo(() => {
    if (!searchTerm.trim()) {
      return filteredWords.slice(0, 10);
    }
    return filteredWords;
  }, [filteredWords, searchTerm]);

  // Handler: Add Standalone Word
  const handleAddSingleWord = useCallback(
    (term: string) => {
      const res = getOrCreateWord(words, term);
      if (!res.created) {
        return { success: false, error: `Word "${term}" already exists.`, word: res.word };
      }

      setWords(res.updatedWords);
      addToast(`Added "${term}".`, 'success');
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

      const duplicate = words.find(
        (w) => w.id !== wordId && w.term.trim().toLowerCase() === newTerm.trim().toLowerCase()
      );
      if (duplicate) {
        return { success: false, error: `Word "${newTerm}" already exists.` };
      }

      const updated = updateWordTerm(words, wordId, newTerm);
      setWords(updated);
      addToast(`Updated to "${newTerm}".`, 'success');
      return { success: true };
    },
    [words, wordsMap, addToast]
  );

  const isSearchEmpty = !searchTerm.trim();

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
      />

      {/* Main Content Area */}
      <main id="app-main-content" className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Navigation Tabs Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            pairsCount={allPairs.length}
            wordsCount={words.length}
          />
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
            onBackupToDrive={() => driveSync.saveToDriveNow(words)}
            onRestoreFromDrive={driveSync.restoreFromDrive}
            onCleanAndDeduplicate={driveSync.cleanAndDeduplicateNow}
            onRefreshStatus={driveSync.refreshStatus}
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
                  Get started by adding your first word pair, or sync with your Google Drive database.
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    id="btn-empty-state-add-word"
                    onClick={() => setIsAddWordOpen(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-semibold rounded-md transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Word</span>
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
                      {isSearchEmpty && filteredPairs.length > 10 ? (
                        <>
                          Showing <strong className="text-slate-200">10</strong> of{' '}
                          <strong className="text-slate-200">{filteredPairs.length}</strong> pairs
                        </>
                      ) : (
                        <>
                          <strong className="text-slate-200">{displayedPairs.length}</strong>{' '}
                          {displayedPairs.length === 1 ? 'pair' : 'pairs'}
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
                        onSelectWord={(term) => setSearchTerm(term)}
                        onEditRelationTag={(wA, wB, currTag) =>
                          setRelationToEdit({ wordA: wA, wordB: wB, currentTag: currTag })
                        }
                        onUnlinkRelation={handleUnlinkRelation}
                        onCopyText={(text) => addToast(`Copied "${text}"`, 'info')}
                      />
                    ))}
                  </div>
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
                      {isSearchEmpty && filteredWords.length > 10 ? (
                        <>
                          Showing <strong className="text-slate-200">10</strong> of{' '}
                          <strong className="text-slate-200">{filteredWords.length}</strong> words
                        </>
                      ) : (
                        <>
                          <strong className="text-slate-200">{displayedWords.length}</strong>{' '}
                          {displayedWords.length === 1 ? 'word' : 'words'}
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
                        onSelectWord={(term) => setSearchTerm(term)}
                        onAddRelationToWord={(w) => setActiveWordForRelation(w)}
                        onEditWord={(w) => setWordToEdit(w)}
                        onDeleteWord={handleDeleteWord}
                        onEditRelationTag={(wA, wB, currTag) =>
                          setRelationToEdit({ wordA: wA, wordB: wB, currentTag: currTag })
                        }
                        onUnlinkRelation={handleUnlinkRelation}
                        onCopyTerm={(term) => addToast(`Copied "${term}"`, 'info')}
                        highlightTerm={searchTerm}
                      />
                    ))}
                  </div>
                </section>
              )
            )}
          </>
        )}
      </main>

      {/* Floating Add Word Action Button */}
      <FloatingAddButton onClick={() => setIsAddWordOpen(true)} />

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

      {/* Minimal Toast Feedback Alerts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
