import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Word, RelationTag, TAG_METADATA } from '../types';
import { extractAllPairs } from '../utils/wordGraph';
import {
  X,
  RotateCcw,
  Brain,
  Check,
  BarChart2,
  Trash2,
  Sparkles,
  Flame,
  Award,
  AlertTriangle,
  ArrowRight,
  HelpCircle,
  Search,
  CheckCircle2,
  XCircle,
  Zap,
} from 'lucide-react';

interface PairDefinition {
  wordA: string;
  wordB: string;
  tag: RelationTag;
}

const DEFAULT_STARTER_PAIRS: PairDefinition[] = [
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
  { wordA: 'Bawang Merah', wordB: 'Bawang Putih', tag: 'cghn' },
  { wordA: 'Garam', wordB: 'Gula', tag: 'cghn' },
  { wordA: 'Siang', wordB: 'Malam', tag: 'cghn' },
  { wordA: 'Hujan', wordB: 'Panas', tag: 'cghn' },
  { wordA: 'Piano', wordB: 'Keyboard', tag: 'ectm' },
  { wordA: 'Polisi', wordB: 'Tentara', tag: 'others' },
  { wordA: 'Mobil', wordB: 'Motor', tag: 'others' },
  { wordA: 'Piring', wordB: 'Mangkuk', tag: 'others' },
  { wordA: 'Sabun', wordB: 'Sampo', tag: 'others' },
  { wordA: 'Kamera', wordB: 'Handphone', tag: 'ectm' },
];

const FALLBACK_DISTRACTOR_POOL = [
  'Batu', 'Pohon', 'Gunung', 'Sungai', 'Angin', 'Awan', 'Roti', 'Susu', 'Apel', 'Jeruk',
  'Kacamata', 'Topi', 'Jaket', 'Tas', 'Jam Tangan', 'Lampu', 'Kipas', 'Pintu', 'Jendela', 'Lantai',
  'Sepeda', 'Kapal', 'Bus', 'Truk', 'Helikopter', 'Bunga', 'Daun', 'Rumput', 'Pelangi', 'Salju'
];

export interface MasteredPairRecord {
  pairKey: string;
  wordA: string;
  wordB: string;
  tag: RelationTag;
  correctCount: number;
  wrongCount: number;
  lastGuessedAt: number;
}

export interface MemoryGameStats {
  totalAnswers: number;
  correctAnswers: number;
  wrongAnswers: number;
  currentStreak: number;
  maxStreak: number;
  uniquePairs: Record<string, MasteredPairRecord>;
}

const DEFAULT_STATS: MemoryGameStats = {
  totalAnswers: 0,
  correctAnswers: 0,
  wrongAnswers: 0,
  currentStreak: 0,
  maxStreak: 0,
  uniquePairs: {},
};

const STATS_STORAGE_KEY = 'spy_dict_pair_memory_limitless_v2';

function loadSavedStats(): MemoryGameStats {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return DEFAULT_STATS;
    const parsed = JSON.parse(raw);
    return {
      totalAnswers: parsed.totalAnswers || 0,
      correctAnswers: parsed.correctAnswers || 0,
      wrongAnswers: parsed.wrongAnswers || 0,
      currentStreak: parsed.currentStreak || 0,
      maxStreak: parsed.maxStreak || 0,
      uniquePairs: parsed.uniquePairs || {},
    };
  } catch {
    return DEFAULT_STATS;
  }
}

function saveStats(stats: MemoryGameStats) {
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save memory quiz stats', e);
  }
}

function normalizeKey(w1: string, w2: string): string {
  const s1 = w1.trim().toLowerCase();
  const s2 = w2.trim().toLowerCase();
  return s1 < s2 ? `${s1}::${s2}` : `${s2}::${s1}`;
}

interface Question {
  promptWord: string;
  correctPartner: string;
  pairKey: string;
  tag: RelationTag;
  options: string[]; // exactly 5 words: 1 correct partner + 4 distractors
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
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [stats, setStats] = useState<MemoryGameStats>(loadSavedStats);
  const [activeTab, setActiveTab] = useState<'game' | 'stats'>('game');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [statsSearchQuery, setStatsSearchQuery] = useState('');

  // 1. Build unified pool of pairs from current dictionary + default starter pairs
  const allPairs = useMemo<PairDefinition[]>(() => {
    const extracted = extractAllPairs(words);
    const seen = new Set<string>();
    const list: PairDefinition[] = [];

    // Prioritize dictionary pairs
    for (const p of extracted) {
      const key = normalizeKey(p.wordA.term, p.wordB.term);
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          wordA: p.wordA.term,
          wordB: p.wordB.term,
          tag: p.tag,
        });
      }
    }

    // Complement with starter pairs for richness
    for (const s of DEFAULT_STARTER_PAIRS) {
      const key = normalizeKey(s.wordA, s.wordB);
      if (!seen.has(key)) {
        seen.add(key);
        list.push(s);
      }
    }

    return list;
  }, [words]);

  // 2. Partner lookup map to ensure distractors are NEVER valid partners of promptWord
  const partnersMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const pair of allPairs) {
      const a = pair.wordA.trim().toLowerCase();
      const b = pair.wordB.trim().toLowerCase();

      if (!map.has(a)) map.set(a, new Set());
      if (!map.has(b)) map.set(b, new Set());

      map.get(a)!.add(b);
      map.get(b)!.add(a);
    }
    return map;
  }, [allPairs]);

  // 3. Pool of all known words
  const allWordsPool = useMemo(() => {
    const set = new Set<string>();
    for (const p of allPairs) {
      set.add(p.wordA.trim());
      set.add(p.wordB.trim());
    }
    for (const f of FALLBACK_DISTRACTOR_POOL) {
      set.add(f.trim());
    }
    return Array.from(set);
  }, [allPairs]);

  // 4. Generate next question
  const generateNextQuestion = useCallback(() => {
    if (allPairs.length === 0) return;

    // Pick random pair
    const randomPair = allPairs[Math.floor(Math.random() * allPairs.length)];
    const isReverse = Math.random() > 0.5;
    const promptWord = isReverse ? randomPair.wordB : randomPair.wordA;
    const correctPartner = isReverse ? randomPair.wordA : randomPair.wordB;
    const pairKey = normalizeKey(promptWord, correctPartner);

    const promptLower = promptWord.trim().toLowerCase();
    const partnerLower = correctPartner.trim().toLowerCase();
    const forbiddenPartners = partnersMap.get(promptLower) || new Set<string>();

    // Candidate distractors: words that are NOT promptWord AND NOT in forbiddenPartners
    const candidateDistractors = allWordsPool.filter((w) => {
      const lower = w.trim().toLowerCase();
      return lower !== promptLower && lower !== partnerLower && !forbiddenPartners.has(lower);
    });

    // Shuffle candidate distractors and pick exactly 4
    const shuffledDistractors = [...candidateDistractors].sort(() => Math.random() - 0.5);
    const chosenDistractors = shuffledDistractors.slice(0, 4);

    // If candidate distractors are fewer than 4 (unlikely), fill from fallback
    while (chosenDistractors.length < 4) {
      for (const fallback of FALLBACK_DISTRACTOR_POOL) {
        const fLower = fallback.trim().toLowerCase();
        if (
          fLower !== promptLower &&
          fLower !== partnerLower &&
          !chosenDistractors.some((d) => d.toLowerCase() === fLower)
        ) {
          chosenDistractors.push(fallback);
          if (chosenDistractors.length === 4) break;
        }
      }
    }

    // Combine 1 correct partner + 4 distractors = 5 options
    const options = [correctPartner, ...chosenDistractors].sort(() => Math.random() - 0.5);

    setCurrentQuestion({
      promptWord,
      correctPartner,
      pairKey,
      tag: randomPair.tag,
      options,
    });
    setSelectedOption(null);
    setIsAnswered(false);
    setQuestionCount((prev) => prev + 1);
  }, [allPairs, partnersMap, allWordsPool]);

  // Initialize on modal open
  useEffect(() => {
    if (isOpen) {
      generateNextQuestion();
    }
  }, [isOpen, generateNextQuestion]);

  // Handle Option Click
  const handleSelectOption = (option: string) => {
    if (isAnswered || !currentQuestion) return;

    setSelectedOption(option);
    setIsAnswered(true);

    const isCorrect =
      option.trim().toLowerCase() === currentQuestion.correctPartner.trim().toLowerCase();

    setStats((prev) => {
      const totalAnswers = prev.totalAnswers + 1;
      const correctAnswers = prev.correctAnswers + (isCorrect ? 1 : 0);
      const wrongAnswers = prev.wrongAnswers + (isCorrect ? 0 : 1); // "every wrong answer count in stats"
      const currentStreak = isCorrect ? prev.currentStreak + 1 : 0;
      const maxStreak = Math.max(prev.maxStreak, currentStreak);

      const uniquePairs = { ...prev.uniquePairs };
      const pairKey = currentQuestion.pairKey;

      if (isCorrect) {
        // Record or increment unique pair guess
        const existing = uniquePairs[pairKey];
        uniquePairs[pairKey] = {
          pairKey,
          wordA: currentQuestion.promptWord,
          wordB: currentQuestion.correctPartner,
          tag: currentQuestion.tag,
          correctCount: (existing?.correctCount || 0) + 1,
          wrongCount: existing?.wrongCount || 0,
          lastGuessedAt: Date.now(),
        };
      } else {
        // Increment wrong count for this pair if encountered
        const existing = uniquePairs[pairKey];
        if (existing) {
          uniquePairs[pairKey] = {
            ...existing,
            wrongCount: existing.wrongCount + 1,
          };
        }
      }

      const updatedStats: MemoryGameStats = {
        totalAnswers,
        correctAnswers,
        wrongAnswers,
        currentStreak,
        maxStreak,
        uniquePairs,
      };

      saveStats(updatedStats);
      return updatedStats;
    });
  };

  // Keyboard shortcut support (1-5 or A-E for options, Space/Enter for Next)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in search bar
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      if (!isAnswered && currentQuestion) {
        const key = e.key.toUpperCase();
        const indexMap: Record<string, number> = {
          '1': 0, '2': 1, '3': 2, '4': 3, '5': 4,
          'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4,
        };
        if (key in indexMap) {
          const idx = indexMap[key];
          if (idx < currentQuestion.options.length) {
            handleSelectOption(currentQuestion.options[idx]);
          }
        }
      } else if (isAnswered) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          generateNextQuestion();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isAnswered, currentQuestion, generateNextQuestion]);

  // Reset stats handler
  const handleResetStats = () => {
    setStats(DEFAULT_STATS);
    saveStats(DEFAULT_STATS);
    setShowResetConfirm(false);
  };

  if (!isOpen) return null;

  const uniquePairsList: MasteredPairRecord[] = Object.values(stats.uniquePairs);
  const uniquePairsCount = uniquePairsList.length;

  const accuracyRate =
    stats.totalAnswers > 0
      ? Math.round((stats.correctAnswers / stats.totalAnswers) * 100)
      : 0;

  // Filter mastered pairs for stats list
  const filteredMasteredPairs = uniquePairsList.filter((p) => {
    if (!statsSearchQuery.trim()) return true;
    const q = statsSearchQuery.toLowerCase();
    return (
      p.wordA.toLowerCase().includes(q) ||
      p.wordB.toLowerCase().includes(q) ||
      p.tag.toLowerCase().includes(q)
    );
  });

  const relationMeta = currentQuestion
    ? TAG_METADATA[currentQuestion.tag] || TAG_METADATA.others
    : TAG_METADATA.others;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div
        id="memory-puzzle-game-dialog"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 shrink-0 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Asah Memori Pasangan Kata
              </h2>
              <p className="text-xs text-slate-400">
                Mode tanpa batas waktu — pilih 1 pasangan yang tepat dari 5 opsi
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="btn-toggle-game-stats"
              onClick={() => setActiveTab(activeTab === 'game' ? 'stats' : 'game')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'stats'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/60'
              }`}
              title="Lihat Statistik & Koleksi Pasangan"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>{activeTab === 'game' ? 'Statistik' : 'Kembali Main'}</span>
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

        {/* Live Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 bg-slate-950/70 border-b border-slate-800/70 text-xs">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Unique Pairs Guessed Badge */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/25 text-purple-300 font-medium"
              title="Jumlah pasangan unik yang berhasil Anda tebak dengan benar"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>
                <strong className="text-purple-200">{uniquePairsCount}</strong> Pasangan Unik
              </span>
            </div>

            {/* Streak Badge */}
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-300 font-medium"
              title="Streak jawaban benar beruntun saat ini"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Streak: <strong className="text-amber-200">{stats.currentStreak}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-slate-400 font-mono">
            {/* Correct Count */}
            <span className="flex items-center gap-1 text-emerald-400 font-semibold" title="Total Jawaban Benar">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{stats.correctAnswers}</span>
            </span>

            {/* Wrong Count */}
            <span className="flex items-center gap-1 text-rose-400 font-semibold" title="Total Jawaban Salah">
              <XCircle className="w-3.5 h-3.5" />
              <span>{stats.wrongAnswers}</span>
            </span>

            {/* Accuracy */}
            <span className="text-slate-400 hidden sm:inline" title="Rasio Akurasi">
              ({accuracyRate}%)
            </span>
          </div>
        </div>

        {/* Main Body */}
        {activeTab === 'game' ? (
          <div className="flex flex-col flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {currentQuestion ? (
              <>
                {/* Target Prompt Card */}
                <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 text-center space-y-2.5 shadow-lg relative overflow-hidden">
                  <div className="absolute top-3 left-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>Pertanyaan #{questionCount}</span>
                  </div>

                  <p className="text-xs sm:text-sm font-medium text-slate-400 pt-1">
                    Manakah pasangan kata yang tepat untuk:
                  </p>

                  <div className="py-2">
                    <span className="inline-block text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-white to-purple-300 tracking-wide px-4 py-1.5 rounded-xl bg-slate-800/40 border border-slate-700/50 shadow-inner">
                      {currentQuestion.promptWord}
                    </span>
                  </div>

                  {/* Feedback on answer */}
                  {isAnswered && (
                    <div className="pt-2 animate-in fade-in zoom-in-95 duration-150">
                      {selectedOption?.trim().toLowerCase() ===
                      currentQuestion.correctPartner.trim().toLowerCase() ? (
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-semibold">
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>
                            Benar! <strong>{currentQuestion.promptWord}</strong> ⇄{' '}
                            <strong>{currentQuestion.correctPartner}</strong>
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${relationMeta.badgeBg} ${relationMeta.badgeText} border ${relationMeta.badgeBorder}`}
                          >
                            {relationMeta.shortCode}
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs sm:text-sm font-semibold">
                          <X className="w-4 h-4 stroke-[3]" />
                          <span>
                            Kurang tepat! Pasangan yang benar:{' '}
                            <strong className="text-emerald-400">{currentQuestion.correctPartner}</strong>
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${relationMeta.badgeBg} ${relationMeta.badgeText} border ${relationMeta.badgeBorder}`}
                          >
                            {relationMeta.shortCode}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 5 Multiple Choice Options */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-medium">
                    <span>Pilih 1 dari 5 pilihan kata di bawah ini:</span>
                    <span className="text-[11px] text-slate-500 hidden sm:inline">
                      Tips: Tekan tombol 1-5 atau A-E di keyboard
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentQuestion.options.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx); // A, B, C, D, E
                      const isCorrect =
                        opt.trim().toLowerCase() ===
                        currentQuestion.correctPartner.trim().toLowerCase();
                      const isSelected = selectedOption === opt;

                      let buttonStyle =
                        'bg-slate-800/60 hover:bg-slate-800 text-slate-200 border-slate-700/70 hover:border-slate-600';
                      let badgeStyle = 'bg-slate-900 text-slate-400 border-slate-700';

                      if (isAnswered) {
                        if (isCorrect) {
                          // Correct partner highlights in green
                          buttonStyle =
                            'bg-emerald-950/40 border-emerald-500/80 text-emerald-100 shadow-md shadow-emerald-950/30 font-bold';
                          badgeStyle = 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold';
                        } else if (isSelected && !isCorrect) {
                          // Selected wrong option highlights in red
                          buttonStyle =
                            'bg-rose-950/40 border-rose-500/80 text-rose-200 shadow-md shadow-rose-950/30 font-bold animate-shake';
                          badgeStyle = 'bg-rose-500 text-white border-rose-400 font-bold';
                        } else {
                          // Other unselected wrong options fade out slightly
                          buttonStyle =
                            'bg-slate-900/40 border-slate-800 text-slate-500 opacity-60 cursor-not-allowed';
                          badgeStyle = 'bg-slate-900/60 text-slate-600 border-slate-800';
                        }
                      }

                      return (
                        <button
                          key={opt}
                          id={`option-btn-${idx}`}
                          onClick={() => handleSelectOption(opt)}
                          disabled={isAnswered}
                          className={`flex items-center justify-between p-3.5 sm:p-4 rounded-xl border text-left transition-all duration-150 cursor-pointer ${buttonStyle} ${
                            !isAnswered ? 'active:scale-[0.98]' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs border font-mono shrink-0 transition-colors ${badgeStyle}`}
                            >
                              {letter}
                            </span>
                            <span className="text-sm sm:text-base font-semibold break-words">
                              {opt}
                            </span>
                          </div>

                          {isAnswered && (
                            <div className="shrink-0 pl-2">
                              {isCorrect && (
                                <Check className="w-5 h-5 text-emerald-400 stroke-[3]" />
                              )}
                              {isSelected && !isCorrect && (
                                <X className="w-5 h-5 text-rose-400 stroke-[3]" />
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Control Bar */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={generateNextQuestion}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer py-1.5 px-2.5 rounded-lg hover:bg-slate-800/60"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Ganti Kata / Lewati</span>
                  </button>

                  {isAnswered && (
                    <button
                      id="btn-next-question"
                      onClick={generateNextQuestion}
                      className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 transition-transform active:scale-95 shadow-md shadow-purple-950/40 cursor-pointer animate-in fade-in slide-in-from-bottom-2"
                    >
                      <span>Pertanyaan Berikutnya</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  )}
                </div>
              </>
            ) : null}
          </div>
        ) : (
          /* Stats & Mastered Pairs View */
          <div className="flex flex-col flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Primary KPI Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Unique Pairs Guessed Correct */}
              <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-3.5 text-center">
                <div className="flex items-center justify-center text-purple-400 mb-1">
                  <Sparkles className="w-4 h-4" />
                </div>
                <p className="text-xs text-slate-400">Pasangan Unik Ditebak</p>
                <p className="text-xl font-extrabold text-purple-300 mt-0.5">
                  {uniquePairsCount}
                </p>
                <span className="text-[10px] text-purple-400/80 font-medium">
                  Berhasil Diingat
                </span>
              </div>

              {/* Accuracy Rate */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-center">
                <div className="flex items-center justify-center text-emerald-400 mb-1">
                  <Award className="w-4 h-4" />
                </div>
                <p className="text-xs text-slate-400">Tingkat Akurasi</p>
                <p className="text-xl font-extrabold text-slate-100 mt-0.5">
                  {accuracyRate}%
                </p>
                <span className="text-[10px] text-emerald-400 font-medium">
                  {stats.correctAnswers} / {stats.totalAnswers} Jawaban
                </span>
              </div>

              {/* Wrong Answers Count */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-center">
                <div className="flex items-center justify-center text-rose-400 mb-1">
                  <XCircle className="w-4 h-4" />
                </div>
                <p className="text-xs text-slate-400">Total Salah</p>
                <p className="text-xl font-extrabold text-rose-400 mt-0.5">
                  {stats.wrongAnswers}
                </p>
                <span className="text-[10px] text-slate-500 font-medium">
                  Dihitung Setiap Ronde
                </span>
              </div>

              {/* Max Streak */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-center">
                <div className="flex items-center justify-center text-amber-400 mb-1">
                  <Flame className="w-4 h-4" />
                </div>
                <p className="text-xs text-slate-400">Rekor Streak</p>
                <p className="text-xl font-extrabold text-amber-400 mt-0.5">
                  {stats.maxStreak} 🔥
                </p>
                <span className="text-[10px] text-slate-500 font-medium">
                  Saat ini: {stats.currentStreak}
                </span>
              </div>
            </div>

            {/* List of Unique Pairs Guessed Correct */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-purple-400" />
                    <span>Daftar Pasangan Unik yang Berhasil Ditebak ({uniquePairsCount})</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Koleksi pasangan kata yang sudah berhasil Anda ingat dengan benar
                  </p>
                </div>

                {uniquePairsCount > 0 && (
                  <div className="relative w-full sm:w-48">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={statsSearchQuery}
                      onChange={(e) => setStatsSearchQuery(e.target.value)}
                      placeholder="Cari pasangan..."
                      className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}
              </div>

              {uniquePairsCount === 0 ? (
                <div className="py-8 text-center text-slate-500 space-y-2">
                  <Brain className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                  <p className="text-xs">
                    Belum ada pasangan unik yang berhasil ditebak.
                  </p>
                  <button
                    onClick={() => setActiveTab('game')}
                    className="text-xs font-semibold text-purple-400 hover:text-purple-300 underline cursor-pointer"
                  >
                    Mulai bermain sekarang!
                  </button>
                </div>
              ) : filteredMasteredPairs.length === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  Tidak ditemukan pasangan dengan kata kunci "{statsSearchQuery}"
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {filteredMasteredPairs.map((pair) => {
                    const meta = TAG_METADATA[pair.tag] || TAG_METADATA.others;
                    return (
                      <div
                        key={pair.pairKey}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase font-bold shrink-0 ${meta.badgeBg} ${meta.badgeText} border ${meta.badgeBorder}`}
                          >
                            {meta.shortCode}
                          </span>
                          <span className="text-xs font-semibold text-slate-200 truncate">
                            {pair.wordA} ⇄ {pair.wordB}
                          </span>
                        </div>

                        <span className="text-[10px] text-emerald-400 font-mono shrink-0 pl-2">
                          ✓ {pair.correctCount}x
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Reset Stats Controls */}
            <div className="pt-2">
              {showResetConfirm ? (
                <div className="p-3.5 bg-rose-950/30 border border-rose-500/40 rounded-xl space-y-2.5 animate-in fade-in">
                  <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Konfirmasi Reset Seluruh Statistik?</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Tindakan ini akan menghapus riwayat pasangan unik yang telah ditebak, total jawaban benar/salah, serta rekor streak Anda.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      id="btn-confirm-reset-stats"
                      onClick={handleResetStats}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Ya, Reset Statistik
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
