import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Word, RelationTag, TAG_METADATA } from '../types';
import { extractAllPairs } from '../utils/wordGraph';
import {
  X,
  RotateCcw,
  Trophy,
  Timer,
  Brain,
  Check,
  BarChart2,
  Trash2,
  Sparkles,
  Flame,
  Award,
  AlertTriangle,
  Play,
} from 'lucide-react';

export type Difficulty = 'easy' | 'medium' | 'hard';

interface DifficultyConfig {
  label: string;
  pairsCount: number;
  gridColsClass: string;
}

const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: {
    label: 'Mudah (4 Pasang)',
    pairsCount: 4,
    gridColsClass: 'grid-cols-2 sm:grid-cols-4',
  },
  medium: {
    label: 'Sedang (6 Pasang)',
    pairsCount: 6,
    gridColsClass: 'grid-cols-3 sm:grid-cols-4',
  },
  hard: {
    label: 'Tantangan (8 Pasang)',
    pairsCount: 8,
    gridColsClass: 'grid-cols-2 sm:grid-cols-4 md:grid-cols-4',
  },
};

const STARTER_PAIRS: Array<{ wordA: string; wordB: string; tag: RelationTag }> = [
  { wordA: 'Kopi', wordB: 'Teh', tag: 'others' },
  { wordA: 'Matahari', wordB: 'Bulan', tag: 'cghn' },
  { wordA: 'Kucing', wordB: 'Anjing', tag: 'cghn' },
  { wordA: 'Gitar', wordB: 'Biola', tag: 'ectm' },
  { wordA: 'Dokter', wordB: 'Perawat', tag: 'others' },
  { wordA: 'Laut', wordB: 'Pantai', tag: 'cghn' },
  { wordA: 'Pena', wordB: 'Pensil', tag: 'others' },
  { wordA: 'Api', wordB: 'Air', tag: 'cghn' },
  { wordA: 'Singa', wordB: 'Harimau', tag: 'cghn' },
  { wordA: 'Pesawat', wordB: 'Kereta', tag: 'others' },
  { wordA: 'Bumi', wordB: 'Bintang', tag: 'cghn' },
  { wordA: 'Sepatu', wordB: 'Sandal', tag: 'others' },
  { wordA: 'Sendok', wordB: 'Garpu', tag: 'others' },
  { wordA: 'Meja', wordB: 'Kursi', tag: 'others' },
  { wordA: 'Buku', wordB: 'Majalah', tag: 'others' },
];

export interface MemoryGameStats {
  gamesPlayed: number;
  gamesWon: number;
  totalMoves: number;
  totalPairsMatched: number;
  bestTimeEasy: number | null;
  bestTimeMedium: number | null;
  bestTimeHard: number | null;
  bestMovesEasy: number | null;
  bestMovesMedium: number | null;
  bestMovesHard: number | null;
  currentStreak: number;
  maxStreak: number;
}

const DEFAULT_STATS: MemoryGameStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  totalMoves: 0,
  totalPairsMatched: 0,
  bestTimeEasy: null,
  bestTimeMedium: null,
  bestTimeHard: null,
  bestMovesEasy: null,
  bestMovesMedium: null,
  bestMovesHard: null,
  currentStreak: 0,
  maxStreak: 0,
};

const STATS_STORAGE_KEY = 'spy_dict_memory_game_stats_v1';

function loadSavedStats(): MemoryGameStats {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return DEFAULT_STATS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATS, ...parsed };
  } catch {
    return DEFAULT_STATS;
  }
}

function saveStats(stats: MemoryGameStats) {
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save memory game stats to localStorage', e);
  }
}

interface GameCard {
  id: string; // unique card id
  pairId: string; // shared between matched pair
  term: string; // the word to show
  partnerTerm: string; // the partner word
  tag: RelationTag;
  isFlipped: boolean;
  isMatched: boolean;
  isError: boolean;
}

interface MemoryGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  words: Word[];
}

export const MemoryGameModal: React.FC<MemoryGameModalProps> = ({
  isOpen,
  onClose,
  words,
}) => {
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [cards, setCards] = useState<GameCard[]>([]);
  const [firstCardId, setFirstCardId] = useState<string | null>(null);
  const [secondCardId, setSecondCardId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [moves, setMoves] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [activeTab, setActiveTab] = useState<'game' | 'stats'>('game');
  const [stats, setStats] = useState<MemoryGameStats>(loadSavedStats);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [recentMatchBanner, setRecentMatchBanner] = useState<string | null>(null);
  const [isNewRecord, setIsNewRecord] = useState<{ time: boolean; moves: boolean }>({
    time: false,
    moves: false,
  });

  const timerRef = useRef<number | null>(null);

  // Available pairs from dictionary or fallback starter pairs
  const availablePairs = useMemo(() => {
    const extracted = extractAllPairs(words);
    if (extracted.length >= 4) {
      return extracted.map((p) => ({
        wordA: p.wordA.term,
        wordB: p.wordB.term,
        tag: p.tag,
      }));
    }

    // Merge dictionary pairs with starter pairs to ensure variety
    const seen = new Set<string>();
    const list: Array<{ wordA: string; wordB: string; tag: RelationTag }> = [];

    for (const p of extracted) {
      const key = `${p.wordA.term.toLowerCase()}::${p.wordB.term.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ wordA: p.wordA.term, wordB: p.wordB.term, tag: p.tag });
      }
    }

    for (const s of STARTER_PAIRS) {
      const key = `${s.wordA.toLowerCase()}::${s.wordB.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push(s);
      }
    }

    return list;
  }, [words]);

  // Start / Restart a fresh game
  const startNewGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const config = DIFFICULTY_CONFIG[difficulty];
    const targetPairsCount = Math.min(config.pairsCount, availablePairs.length);

    // Shuffle and pick target pairs
    const shuffledPairs = [...availablePairs].sort(() => Math.random() - 0.5);
    const selectedPairs = shuffledPairs.slice(0, targetPairsCount);

    // Generate 2 cards per pair
    const generatedCards: GameCard[] = [];
    selectedPairs.forEach((pair, index) => {
      const pairId = `pair_${index}_${Date.now()}`;
      generatedCards.push({
        id: `card_${index}_a`,
        pairId,
        term: pair.wordA,
        partnerTerm: pair.wordB,
        tag: pair.tag,
        isFlipped: false,
        isMatched: false,
        isError: false,
      });
      generatedCards.push({
        id: `card_${index}_b`,
        pairId,
        term: pair.wordB,
        partnerTerm: pair.wordA,
        tag: pair.tag,
        isFlipped: false,
        isMatched: false,
        isError: false,
      });
    });

    // Shuffle the cards grid
    const randomizedCards = generatedCards.sort(() => Math.random() - 0.5);

    setCards(randomizedCards);
    setFirstCardId(null);
    setSecondCardId(null);
    setIsProcessing(false);
    setMoves(0);
    setMatchedCount(0);
    setSecondsElapsed(0);
    setIsVictory(false);
    setIsGameActive(true);
    setRecentMatchBanner(null);
    setIsNewRecord({ time: false, moves: false });

    // Update stats: gamesPlayed + 1
    setStats((prev) => {
      const updated = {
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1,
      };
      saveStats(updated);
      return updated;
    });

    // Start timer interval
    timerRef.current = window.setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
  }, [difficulty, availablePairs]);

  // Restart game on open or difficulty change
  useEffect(() => {
    if (isOpen) {
      startNewGame();
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setIsGameActive(false);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isOpen, difficulty]);

  // Format seconds into MM:SS
  const formatTime = (secs: number): string => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  // Card click handler
  const handleCardClick = (cardId: string) => {
    if (isProcessing || !isGameActive) return;

    const clicked = cards.find((c) => c.id === cardId);
    if (!clicked || clicked.isFlipped || clicked.isMatched) return;

    // Flip the card
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, isFlipped: true } : c))
    );

    // If no card is flipped yet in this turn
    if (!firstCardId) {
      setFirstCardId(cardId);
      return;
    }

    // Second card flipped
    setSecondCardId(cardId);
    setIsProcessing(true);
    setMoves((prev) => prev + 1);

    const firstCard = cards.find((c) => c.id === firstCardId);
    if (!firstCard) {
      setIsProcessing(false);
      setFirstCardId(null);
      setSecondCardId(null);
      return;
    }

    // Check match
    if (firstCard.pairId === clicked.pairId) {
      // MATCH!
      const totalPairs = DIFFICULTY_CONFIG[difficulty].pairsCount;
      const nextMatchedCount = matchedCount + 1;

      setTimeout(() => {
        setCards((prev) =>
          prev.map((c) =>
            c.id === firstCardId || c.id === cardId
              ? { ...c, isMatched: true }
              : c
          )
        );

        setMatchedCount(nextMatchedCount);
        setRecentMatchBanner(`✨ Pasangan Cocok: ${firstCard.term} ⇄ ${clicked.term}`);
        setFirstCardId(null);
        setSecondCardId(null);
        setIsProcessing(false);

        // Clear banner after 2.5s
        setTimeout(() => setRecentMatchBanner(null), 2500);

        // Check if game won
        if (nextMatchedCount === totalPairs) {
          handleVictory(nextMatchedCount);
        }
      }, 350);
    } else {
      // MISMATCH!
      setTimeout(() => {
        // Show error shake
        setCards((prev) =>
          prev.map((c) =>
            c.id === firstCardId || c.id === cardId ? { ...c, isError: true } : c
          )
        );

        setTimeout(() => {
          // Flip back
          setCards((prev) =>
            prev.map((c) =>
              c.id === firstCardId || c.id === cardId
                ? { ...c, isFlipped: false, isError: false }
                : c
            )
          );
          setFirstCardId(null);
          setSecondCardId(null);
          setIsProcessing(false);
        }, 650);
      }, 400);
    }
  };

  // Victory handler
  const handleVictory = (completedPairs: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsGameActive(false);
    setIsVictory(true);

    const currentMoves = moves + 1;
    const finalSeconds = secondsElapsed;

    // Check and save stats
    setStats((prev) => {
      let isTimeRecord = false;
      let isMoveRecord = false;

      let bestTime = prev.bestTimeEasy;
      let bestMoves = prev.bestMovesEasy;

      if (difficulty === 'medium') {
        bestTime = prev.bestTimeMedium;
        bestMoves = prev.bestMovesMedium;
      } else if (difficulty === 'hard') {
        bestTime = prev.bestTimeHard;
        bestMoves = prev.bestMovesHard;
      }

      if (bestTime === null || finalSeconds < bestTime) {
        isTimeRecord = true;
      }
      if (bestMoves === null || currentMoves < bestMoves) {
        isMoveRecord = true;
      }

      setIsNewRecord({ time: isTimeRecord, moves: isMoveRecord });

      const newCurrentStreak = prev.currentStreak + 1;
      const newMaxStreak = Math.max(prev.maxStreak, newCurrentStreak);

      const updated: MemoryGameStats = {
        ...prev,
        gamesWon: prev.gamesWon + 1,
        totalMoves: prev.totalMoves + currentMoves,
        totalPairsMatched: prev.totalPairsMatched + completedPairs,
        currentStreak: newCurrentStreak,
        maxStreak: newMaxStreak,
        bestTimeEasy:
          difficulty === 'easy'
            ? prev.bestTimeEasy === null
              ? finalSeconds
              : Math.min(prev.bestTimeEasy, finalSeconds)
            : prev.bestTimeEasy,
        bestTimeMedium:
          difficulty === 'medium'
            ? prev.bestTimeMedium === null
              ? finalSeconds
              : Math.min(prev.bestTimeMedium, finalSeconds)
            : prev.bestTimeMedium,
        bestTimeHard:
          difficulty === 'hard'
            ? prev.bestTimeHard === null
              ? finalSeconds
              : Math.min(prev.bestTimeHard, finalSeconds)
            : prev.bestTimeHard,
        bestMovesEasy:
          difficulty === 'easy'
            ? prev.bestMovesEasy === null
              ? currentMoves
              : Math.min(prev.bestMovesEasy, currentMoves)
            : prev.bestMovesEasy,
        bestMovesMedium:
          difficulty === 'medium'
            ? prev.bestMovesMedium === null
              ? currentMoves
              : Math.min(prev.bestMovesMedium, currentMoves)
            : prev.bestMovesMedium,
        bestMovesHard:
          difficulty === 'hard'
            ? prev.bestMovesHard === null
              ? currentMoves
              : Math.min(prev.bestMovesHard, currentMoves)
            : prev.bestMovesHard,
      };

      saveStats(updated);
      return updated;
    });
  };

  // Reset Stats handler
  const handleResetStats = () => {
    setStats(DEFAULT_STATS);
    saveStats(DEFAULT_STATS);
    setShowResetConfirm(false);
  };

  if (!isOpen) return null;

  const totalPairsTarget = DIFFICULTY_CONFIG[difficulty].pairsCount;
  const winRate =
    stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <div
        id="memory-puzzle-game-dialog"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Teka-Teki Memori Pasangan Kata
              </h2>
              <p className="text-xs text-slate-400">
                Ingat dan cocokkan pasangan kata rahasia dengan tepat
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="btn-toggle-game-stats"
              onClick={() => setActiveTab(activeTab === 'game' ? 'stats' : 'game')}
              className={`p-2 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'stats'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/60'
              }`}
              title="Lihat Statistik Permainan"
            >
              <BarChart2 className="w-4 h-4" />
              <span className="hidden sm:inline">Statistik</span>
            </button>

            <button
              id="btn-close-memory-game"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Tutup Game"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switch: Game vs Stats */}
        {activeTab === 'game' ? (
          <div className="flex flex-col flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* Controls & Difficulty Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3">
              {/* Difficulty Chips */}
              <div className="flex items-center gap-1.5">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => {
                      if (difficulty !== lvl) {
                        setDifficulty(lvl);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      difficulty === lvl
                        ? 'bg-purple-500 text-slate-950 font-semibold shadow-sm'
                        : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {lvl === 'easy' ? 'Mudah' : lvl === 'medium' ? 'Sedang' : 'Sulit'}
                  </button>
                ))}
              </div>

              {/* Status Metric Badges */}
              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                  <Timer className="w-3.5 h-3.5 text-sky-400" />
                  <span>{formatTime(secondsElapsed)}</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                  <span className="text-slate-400">Langkah:</span>
                  <span className="text-amber-300 font-bold">{moves}</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-300 bg-slate-900 px-2.5 py-1 rounded-md border border-slate-800">
                  <span className="text-slate-400">Cocok:</span>
                  <span className="text-emerald-400 font-bold">
                    {matchedCount}/{totalPairsTarget}
                  </span>
                </div>

                <button
                  onClick={startNewGame}
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-md border border-slate-800 transition-colors cursor-pointer"
                  title="Ulangi Permainan"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Notification Banner for Recent Match */}
            {recentMatchBanner && (
              <div className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium text-center animate-in fade-in slide-in-from-top-2">
                {recentMatchBanner}
              </div>
            )}

            {/* Victory Overlay if Won */}
            {isVictory ? (
              <div className="flex flex-col items-center justify-center p-6 bg-slate-950/70 border border-purple-500/30 rounded-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-950/50">
                  <Trophy className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                    Luar Biasa! Pasangan Lengkap 🎉
                  </h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Kamu berhasil mengingat dan mencocokkan semua {totalPairsTarget} pasangan kata dengan sangat baik!
                  </p>
                </div>

                {/* Score Summary Card */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-center">
                    <p className="text-[11px] text-slate-400">Waktu</p>
                    <p className="text-base font-bold text-sky-400 font-mono mt-0.5">
                      {formatTime(secondsElapsed)}
                    </p>
                    {isNewRecord.time && (
                      <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
                        ⚡ Rekor Baru!
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-center">
                    <p className="text-[11px] text-slate-400">Langkah</p>
                    <p className="text-base font-bold text-amber-300 font-mono mt-0.5">
                      {moves}
                    </p>
                    {isNewRecord.moves && (
                      <span className="text-[10px] text-emerald-400 font-bold block mt-0.5">
                        🏆 Rekor Baru!
                      </span>
                    )}
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 text-center">
                    <p className="text-[11px] text-slate-400">Akurasi</p>
                    <p className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                      {moves > 0 ? Math.round((totalPairsTarget / moves) * 100) : 100}%
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={startNewGame}
                    className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-transform active:scale-95 shadow-md shadow-purple-950/40 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>Main Lagi</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('stats')}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
                  >
                    <BarChart2 className="w-4 h-4 text-purple-400" />
                    <span>Lihat Statistik</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Puzzle Card Grid */
              <div
                className={`grid ${DIFFICULTY_CONFIG[difficulty].gridColsClass} gap-2.5 sm:gap-3 flex-1 items-stretch`}
              >
                {cards.map((card) => {
                  const meta = TAG_METADATA[card.tag] || TAG_METADATA.others;
                  const isVisible = card.isFlipped || card.isMatched;

                  return (
                    <button
                      key={card.id}
                      onClick={() => handleCardClick(card.id)}
                      disabled={card.isMatched || card.isFlipped || isProcessing}
                      className={`relative min-h-[90px] sm:min-h-[105px] p-3 rounded-xl flex flex-col items-center justify-center text-center transition-all duration-200 select-none cursor-pointer ${
                        card.isMatched
                          ? 'bg-emerald-950/30 border-2 border-emerald-500/50 shadow-md shadow-emerald-950/30 opacity-90 cursor-default'
                          : card.isError
                          ? 'bg-rose-950/30 border-2 border-rose-500/80 animate-shake'
                          : isVisible
                          ? 'bg-slate-800/90 border-2 border-purple-500/60 shadow-md shadow-purple-950/30'
                          : 'bg-slate-800/50 hover:bg-slate-800 border border-slate-700/70 hover:border-sky-500/40 active:scale-95'
                      }`}
                    >
                      {isVisible ? (
                        <div className="flex flex-col items-center justify-center w-full space-y-1.5 animate-in fade-in zoom-in-90 duration-150">
                          {/* Tag Indicator */}
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${meta.badgeBg} ${meta.badgeText} border ${meta.badgeBorder}`}
                          >
                            {meta.shortCode}
                          </span>

                          {/* Term */}
                          <span className="text-sm sm:text-base font-bold text-slate-100 line-clamp-2 px-1 break-words">
                            {card.term}
                          </span>

                          {/* If matched, show match badge */}
                          {card.isMatched && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                              <Check className="w-3 h-3 stroke-[3]" />
                              <span>Cocok</span>
                            </span>
                          )}
                        </div>
                      ) : (
                        /* Card Back (Facedown) */
                        <div className="flex flex-col items-center justify-center space-y-1 text-slate-500 group-hover:text-slate-400">
                          <div className="w-7 h-7 rounded-lg bg-slate-900/80 border border-slate-700/60 flex items-center justify-center text-xs font-bold text-slate-400">
                            ?
                          </div>
                          <span className="text-[10px] tracking-wider uppercase font-semibold text-slate-500">
                            PILIH
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Stats Tab */
          <div className="flex flex-col flex-1 overflow-y-auto p-5 space-y-5">
            {/* Top Stat Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-center">
                <div className="flex items-center justify-center text-purple-400 mb-1">
                  <Award className="w-4 h-4" />
                </div>
                <p className="text-xs text-slate-400">Kemenangan</p>
                <p className="text-lg font-bold text-slate-100 mt-0.5">
                  {stats.gamesWon} / {stats.gamesPlayed}
                </p>
                <span className="text-[10px] text-purple-400 font-medium">
                  {winRate}% Menang
                </span>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-center">
                <div className="flex items-center justify-center text-emerald-400 mb-1">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <p className="text-xs text-slate-400">Pasangan Dicocokkan</p>
                <p className="text-lg font-bold text-emerald-400 mt-0.5">
                  {stats.totalPairsMatched}
                </p>
                <span className="text-[10px] text-slate-500 font-medium">
                  Total Pasangan
                </span>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-center">
                <div className="flex items-center justify-center text-amber-400 mb-1">
                  <Flame className="w-4 h-4" />
                </div>
                <p className="text-xs text-slate-400">Streak Saat Ini</p>
                <p className="text-lg font-bold text-amber-400 mt-0.5">
                  {stats.currentStreak} 🔥
                </p>
                <span className="text-[10px] text-slate-500 font-medium">
                  Rekor: {stats.maxStreak}
                </span>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-center">
                <div className="flex items-center justify-center text-sky-400 mb-1">
                  <Brain className="w-4 h-4" />
                </div>
                <p className="text-xs text-slate-400">Total Langkah</p>
                <p className="text-lg font-bold text-sky-400 mt-0.5">
                  {stats.totalMoves}
                </p>
                <span className="text-[10px] text-slate-500 font-medium">
                  Semua Game
                </span>
              </div>
            </div>

            {/* High Scores by Difficulty */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Rekor Terbaik Per Tingkat Kesulitan</span>
              </h4>

              <div className="divide-y divide-slate-800/80 text-xs">
                {/* Easy */}
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-200">Mudah (4 Pasang)</span>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Waktu Terbaik</span>
                      <span className="font-mono text-sky-400 font-bold">
                        {stats.bestTimeEasy !== null ? formatTime(stats.bestTimeEasy) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Langkah Tersedikit</span>
                      <span className="font-mono text-amber-300 font-bold">
                        {stats.bestMovesEasy !== null ? `${stats.bestMovesEasy} langkah` : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Medium */}
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-200">Sedang (6 Pasang)</span>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Waktu Terbaik</span>
                      <span className="font-mono text-sky-400 font-bold">
                        {stats.bestTimeMedium !== null ? formatTime(stats.bestTimeMedium) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Langkah Tersedikit</span>
                      <span className="font-mono text-amber-300 font-bold">
                        {stats.bestMovesMedium !== null ? `${stats.bestMovesMedium} langkah` : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hard */}
                <div className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-200">Sulit (8 Pasang)</span>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Waktu Terbaik</span>
                      <span className="font-mono text-sky-400 font-bold">
                        {stats.bestTimeHard !== null ? formatTime(stats.bestTimeHard) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Langkah Tersedikit</span>
                      <span className="font-mono text-amber-300 font-bold">
                        {stats.bestMovesHard !== null ? `${stats.bestMovesHard} langkah` : '-'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reset Stats Section */}
            <div className="pt-2">
              {showResetConfirm ? (
                <div className="p-3.5 bg-rose-950/30 border border-rose-500/40 rounded-xl space-y-2.5 animate-in fade-in">
                  <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Konfirmasi Reset Statistik Permainan?</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Semua riwayat kemenangan, streak, dan rekor waktu terbaik akan dikembalikan ke 0.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      id="btn-confirm-reset-stats"
                      onClick={handleResetStats}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Ya, Reset Semua
                    </button>
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  id="btn-open-reset-stats"
                  onClick={() => setShowResetConfirm(true)}
                  className="px-3.5 py-2 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset Statistik</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
