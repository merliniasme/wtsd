import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Word, RelationTag, TAG_METADATA } from '../types';
import { extractAllPairs } from '../utils/wordGraph';
import {
  X,
  RotateCcw,
  Check,
  BarChart2,
  Trash2,
  Sparkles,
  Flame,
  ArrowRight,
  Search,
  CheckCircle2,
  XCircle,
  Volume2,
  VolumeX,
  Play,
  Zap,
} from 'lucide-react';

interface PairDefinition {
  wordA: string;
  wordB: string;
  tag: RelationTag;
}

// Generous library of default starter pairs to ensure infinite, varied gameplay
const DEFAULT_STARTER_PAIRS: PairDefinition[] = [
  { wordA: 'Matahari', wordB: 'Bulan', tag: 'cghn' },
  { wordA: 'Kopi', wordB: 'Teh', tag: 'others' },
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
  { wordA: 'Emas', wordB: 'Perak', tag: 'cghn' },
  { wordA: 'Raja', wordB: 'Ratu', tag: 'cghn' },
  { wordA: 'Pintu', wordB: 'Jendela', tag: 'others' },
  { wordA: 'Guru', wordB: 'Murid', tag: 'others' },
  { wordA: 'Jarum', wordB: 'Benang', tag: 'others' },
  { wordA: 'Kunci', wordB: 'Gembok', tag: 'others' },
  { wordA: 'Kaos', wordB: 'Kemeja', tag: 'others' },
  { wordA: 'Danau', wordB: 'Kolam', tag: 'cghn' },
  { wordA: 'Kasur', wordB: 'Bantal', tag: 'others' },
  { wordA: 'Jam', wordB: 'Menit', tag: 'others' },
  { wordA: 'Rumah', wordB: 'Kantor', tag: 'others' },
  { wordA: 'Palu', wordB: 'Paku', tag: 'others' },
  { wordA: 'Roti', wordB: 'Selai', tag: 'others' },
  { wordA: 'Susu', wordB: 'Cokelat', tag: 'others' },
  { wordA: 'Topi', wordB: 'Kacamata', tag: 'others' },
];

const FALLBACK_DISTRACTOR_POOL = [
  'Batu', 'Pohon', 'Gunung', 'Sungai', 'Angin', 'Awan', 'Roti', 'Susu', 'Apel', 'Jeruk',
  'Kacamata', 'Topi', 'Jaket', 'Tas', 'Lampu', 'Kipas', 'Lantai', 'Sepeda', 'Kapal', 'Bus',
  'Truk', 'Helikopter', 'Bunga', 'Daun', 'Rumput', 'Pelangi', 'Salju', 'Jembatan', 'Pasar', 'Taman',
  'Dompet', 'Kabel', 'Kardus', 'Gelas', 'Botol', 'Kain', 'Payung', 'Bantal', 'Sapu', 'Ember'
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

const STATS_STORAGE_KEY = 'spy_dict_pair_memory_limitless_v3';
const SOUND_SETTING_KEY = 'spy_dict_memory_game_sound';
const AUTO_NEXT_SETTING_KEY = 'spy_dict_memory_game_autonext';

function playSound(type: 'correct' | 'wrong', enabled: boolean) {
  if (!enabled) return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'correct') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.08); // E5
      osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.16); // G5
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
      osc.start();
      osc.stop(ctx.currentTime + 0.32);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.14, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    }
  } catch {
    // Ignore audio permission or blocked playback issues
  }
}

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
  const [statsSearchQuery, setStatsSearchQuery] = useState('');
  const [isSoundOn, setIsSoundOn] = useState<boolean>(() => {
    return localStorage.getItem(SOUND_SETTING_KEY) !== 'false';
  });
  const [isAutoNext, setIsAutoNext] = useState<boolean>(() => {
    return localStorage.getItem(AUTO_NEXT_SETTING_KEY) === 'true';
  });

  const autoNextTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Toggle Sound setting
  const toggleSound = () => {
    setIsSoundOn((prev) => {
      const next = !prev;
      localStorage.setItem(SOUND_SETTING_KEY, String(next));
      return next;
    });
  };

  // Toggle Auto-Next setting
  const toggleAutoNext = () => {
    setIsAutoNext((prev) => {
      const next = !prev;
      localStorage.setItem(AUTO_NEXT_SETTING_KEY, String(next));
      return next;
    });
  };

  // 1. Build unified pool of pairs from current dictionary + default starter pairs
  const allPairs = useMemo<PairDefinition[]>(() => {
    const extracted = extractAllPairs(words);
    const seen = new Set<string>();
    const list: PairDefinition[] = [];

    // Prioritize dictionary pairs
    for (const p of extracted) {
      const termA = p.wordA?.term?.trim();
      const termB = p.wordB?.term?.trim();
      if (!termA || !termB) continue;

      const key = normalizeKey(termA, termB);
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          wordA: termA,
          wordB: termB,
          tag: p.tag,
        });
      }
    }

    // Complement with starter pairs for variety
    for (const s of DEFAULT_STARTER_PAIRS) {
      const termA = s.wordA.trim();
      const termB = s.wordB.trim();
      if (!termA || !termB) continue;

      const key = normalizeKey(termA, termB);
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          wordA: termA,
          wordB: termB,
          tag: s.tag,
        });
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

  // 3. Pool of all known words for distractors
  const allWordsPool = useMemo(() => {
    const set = new Set<string>();
    for (const p of allPairs) {
      if (p.wordA.trim()) set.add(p.wordA.trim());
      if (p.wordB.trim()) set.add(p.wordB.trim());
    }
    for (const f of FALLBACK_DISTRACTOR_POOL) {
      if (f.trim()) set.add(f.trim());
    }
    return Array.from(set);
  }, [allPairs]);

  // 4. Generate next question (Guaranteed to produce valid non-empty prompt and 5 distinct options)
  const generateNextQuestion = useCallback(() => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }

    const sourcePool = allPairs.length > 0 ? allPairs : DEFAULT_STARTER_PAIRS;
    const randomPair = sourcePool[Math.floor(Math.random() * sourcePool.length)];

    const isReverse = Math.random() > 0.5;
    const promptWord = (isReverse ? randomPair.wordB : randomPair.wordA).trim();
    const correctPartner = (isReverse ? randomPair.wordA : randomPair.wordB).trim();
    const pairKey = normalizeKey(promptWord, correctPartner);

    const promptLower = promptWord.toLowerCase();
    const partnerLower = correctPartner.toLowerCase();
    const forbiddenPartners = partnersMap.get(promptLower) || new Set<string>();

    // Filter candidate distractors
    const candidateDistractors = allWordsPool.filter((w) => {
      const lower = w.trim().toLowerCase();
      return (
        lower.length > 0 &&
        lower !== promptLower &&
        lower !== partnerLower &&
        !forbiddenPartners.has(lower)
      );
    });

    // Shuffle and pick 4 distractors
    const shuffledDistractors = [...candidateDistractors].sort(() => Math.random() - 0.5);
    const chosenDistractors = shuffledDistractors.slice(0, 4);

    // Fallback if not enough distractors
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

    // Combine into exactly 5 options: 1 correct + 4 distractors
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
  }, [allPairs, partnersMap, allWordsPool]);

  // Clean up timer on unmount or close
  useEffect(() => {
    return () => {
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
      }
    };
  }, []);

  // Initialize immediately on open
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

    // Play feedback sound
    playSound(isCorrect ? 'correct' : 'wrong', isSoundOn);

    // Update persistent stats
    setStats((prev) => {
      const totalAnswers = prev.totalAnswers + 1;
      const correctAnswers = prev.correctAnswers + (isCorrect ? 1 : 0);
      const wrongAnswers = prev.wrongAnswers + (isCorrect ? 0 : 1); // Counts every wrong answer
      const currentStreak = isCorrect ? prev.currentStreak + 1 : 0;
      const maxStreak = Math.max(prev.maxStreak, currentStreak);

      const uniquePairs = { ...prev.uniquePairs };
      const pairKey = currentQuestion.pairKey;

      if (isCorrect) {
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

    // Handle auto-advance if enabled
    if (isAutoNext) {
      autoNextTimerRef.current = setTimeout(() => {
        generateNextQuestion();
      }, 1250);
    }
  };

  // Keyboard shortcut support (1-5 or A-E to select, Space/Enter to advance)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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

  const isCurrentCorrect =
    isAnswered &&
    currentQuestion &&
    selectedOption?.trim().toLowerCase() === currentQuestion.correctPartner.trim().toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <div
        id="memory-puzzle-game-dialog"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Sleek, Clean Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 leading-tight">
                Tebak Pasangan Kata
              </h2>
              <p className="text-[11px] text-slate-400">
                Mode santai tanpa batas waktu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                isSoundOn
                  ? 'bg-slate-800 text-purple-300 border-slate-700'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
              title={isSoundOn ? 'Suara Aktif (Klik untuk mute)' : 'Suara Mati'}
            >
              {isSoundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Switch to Stats / Back to Game */}
            <button
              id="btn-toggle-game-stats"
              onClick={() => setActiveTab(activeTab === 'game' ? 'stats' : 'game')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'stats'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>{activeTab === 'game' ? 'Statistik' : 'Main'}</span>
            </button>

            {/* Close Button */}
            <button
              id="btn-close-memory-game"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-0.5"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Minimal High-Contrast Live Score Pill Bar */}
        <div className="flex items-center justify-around px-4 py-2 bg-slate-950/60 border-b border-slate-800 text-xs">
          {/* Unique Pairs Guessed Correct */}
          <div className="flex items-center gap-1.5" title="Jumlah total pasangan unik yang berhasil ditebak">
            <span className="text-[11px] text-slate-400">Pasangan Unik:</span>
            <span className="font-extrabold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-md font-mono">
              {uniquePairsCount}
            </span>
          </div>

          {/* Streak Counter */}
          <div className="flex items-center gap-1" title="Streak jawaban benar beruntun">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] text-slate-400">Streak:</span>
            <span className="font-bold text-amber-300 font-mono">
              {stats.currentStreak}
            </span>
          </div>

          {/* Wrong Answer Counter */}
          <div className="flex items-center gap-1" title="Setiap jawaban salah dicatat di sini">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span className="text-[11px] text-slate-400">Salah:</span>
            <span className="font-bold text-rose-400 font-mono">
              {stats.wrongAnswers}
            </span>
          </div>

          {/* Accuracy */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400">
            <span>Akurasi:</span>
            <span className="font-mono text-slate-200 font-medium">{accuracyRate}%</span>
          </div>
        </div>

        {/* Game Area */}
        {activeTab === 'game' ? (
          <div className="p-5 flex flex-col space-y-4">
            {currentQuestion ? (
              <>
                {/* PROMINENT, ULTRA-CLEAR TARGET WORD CARD */}
                <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-5 text-center shadow-lg relative overflow-hidden">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-purple-400/90 block mb-1">
                    Cari Pasangan Dari Kata
                  </span>

                  {/* Guaranteed Solid, Visible, High-Contrast Typography */}
                  <div className="py-2.5">
                    <h1 className="text-3xl sm:text-4xl font-black text-white tracking-normal drop-shadow-sm break-words select-all">
                      {currentQuestion.promptWord}
                    </h1>
                  </div>

                  {/* Tag Indicator */}
                  <div className="inline-flex items-center gap-1.5 mt-1">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${relationMeta.badgeBg} ${relationMeta.badgeText} border ${relationMeta.badgeBorder}`}
                    >
                      {relationMeta.label}
                    </span>
                  </div>

                  {/* Immediate Feedback Notification */}
                  {isAnswered && (
                    <div className="mt-3.5 pt-3 border-t border-slate-800/80 animate-in fade-in duration-150">
                      {isCurrentCorrect ? (
                        <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-400">
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>
                            Benar! {currentQuestion.promptWord} ⇄ {currentQuestion.correctPartner}
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-rose-400">
                          <X className="w-4 h-4 stroke-[3]" />
                          <span>
                            Salah! Pasangannya adalah{' '}
                            <span className="text-emerald-300 underline font-extrabold">
                              {currentQuestion.correctPartner}
                            </span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 5 Clean, Multiple-Choice Option Buttons */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 font-medium">
                    <span>Pilih 1 jawaban yang tepat:</span>
                    <span className="hidden sm:inline text-slate-500">Shortcut: 1-5 atau A-E</span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {currentQuestion.options.map((optionText, idx) => {
                      const letter = String.fromCharCode(65 + idx); // A, B, C, D, E
                      const isCorrect =
                        optionText.trim().toLowerCase() ===
                        currentQuestion.correctPartner.trim().toLowerCase();
                      const isSelected = selectedOption === optionText;

                      let containerStyle =
                        'bg-slate-800/80 hover:bg-slate-800 hover:border-purple-500/50 text-slate-200 border-slate-700/80 active:scale-[0.99]';
                      let letterStyle = 'bg-slate-900/90 text-slate-400 border-slate-700';

                      if (isAnswered) {
                        if (isCorrect) {
                          // Correct answer glows green
                          containerStyle =
                            'bg-emerald-950/60 border-emerald-500 text-emerald-100 font-bold ring-1 ring-emerald-500/50';
                          letterStyle = 'bg-emerald-500 text-slate-950 font-black border-emerald-400';
                        } else if (isSelected && !isCorrect) {
                          // Wrong picked option glows red
                          containerStyle =
                            'bg-rose-950/60 border-rose-500 text-rose-100 font-bold ring-1 ring-rose-500/50';
                          letterStyle = 'bg-rose-500 text-white font-black border-rose-400';
                        } else {
                          // Others fade out
                          containerStyle =
                            'bg-slate-950/40 border-slate-800/80 text-slate-500 opacity-50 cursor-not-allowed';
                          letterStyle = 'bg-slate-900/40 text-slate-600 border-slate-800';
                        }
                      }

                      return (
                        <button
                          key={optionText}
                          id={`mc-option-${idx}`}
                          onClick={() => handleSelectOption(optionText)}
                          disabled={isAnswered}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all duration-150 cursor-pointer ${containerStyle}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono font-bold shrink-0 border ${letterStyle}`}
                            >
                              {letter}
                            </span>
                            <span className="text-sm font-semibold truncate">
                              {optionText}
                            </span>
                          </div>

                          {isAnswered && isCorrect && (
                            <Check className="w-5 h-5 text-emerald-400 stroke-[3] shrink-0 ml-2" />
                          )}
                          {isAnswered && isSelected && !isCorrect && (
                            <X className="w-5 h-5 text-rose-400 stroke-[3] shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Bar Controls */}
                <div className="pt-2 flex items-center justify-between">
                  {/* Auto-Next Switch */}
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAutoNext}
                      onChange={toggleAutoNext}
                      className="w-3.5 h-3.5 rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span>Lanjut Otomatis (1.2s)</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={generateNextQuestion}
                      className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                      title="Lewati kata ini"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Ganti Kata</span>
                    </button>

                    {isAnswered && (
                      <button
                        id="btn-next-question"
                        onClick={generateNextQuestion}
                        className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95 shadow-md shadow-purple-950/50 cursor-pointer"
                      >
                        <span>Lanjut</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <p>Memuat soal...</p>
              </div>
            )}
          </div>
        ) : (
          /* Stats & Mastered Pairs View */
          <div className="p-5 flex flex-col space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded-xl text-center">
                <span className="text-[10px] text-purple-300 font-medium block">Pasangan Unik</span>
                <span className="text-xl font-black text-purple-200 font-mono mt-0.5 block">
                  {uniquePairsCount}
                </span>
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                <span className="text-[10px] text-emerald-400 font-medium block">Total Benar</span>
                <span className="text-xl font-black text-emerald-300 font-mono mt-0.5 block">
                  {stats.correctAnswers}
                </span>
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                <span className="text-[10px] text-rose-400 font-medium block">Total Salah</span>
                <span className="text-xl font-black text-rose-400 font-mono mt-0.5 block">
                  {stats.wrongAnswers}
                </span>
              </div>

              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-center">
                <span className="text-[10px] text-amber-400 font-medium block">Max Streak</span>
                <span className="text-xl font-black text-amber-300 font-mono mt-0.5 block">
                  {stats.maxStreak} 🔥
                </span>
              </div>
            </div>

            {/* List of Unique Pairs Guessed Correct */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  <span>Koleksi Pasangan Unik Ditebak ({uniquePairsCount})</span>
                </h4>

                {uniquePairsCount > 0 && (
                  <div className="relative w-40">
                    <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={statsSearchQuery}
                      onChange={(e) => setStatsSearchQuery(e.target.value)}
                      placeholder="Cari..."
                      className="w-full pl-6 pr-2 py-0.5 text-xs bg-slate-900 border border-slate-700 rounded-md text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                )}
              </div>

              {uniquePairsCount === 0 ? (
                <div className="py-6 text-center text-slate-500 text-xs">
                  Belum ada pasangan unik yang berhasil ditebak. Mainkan tebak pasangan sekarang!
                </div>
              ) : filteredMasteredPairs.length === 0 ? (
                <div className="py-4 text-center text-slate-500 text-xs">
                  Tidak ditemukan dengan kata kunci "{statsSearchQuery}"
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {filteredMasteredPairs.map((pair) => {
                    const meta = TAG_METADATA[pair.tag] || TAG_METADATA.others;
                    return (
                      <div
                        key={pair.pairKey}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800/80 text-xs"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`text-[9px] px-1 rounded uppercase font-mono font-bold ${meta.badgeBg} ${meta.badgeText}`}
                          >
                            {meta.shortCode}
                          </span>
                          <span className="font-medium text-slate-200 truncate">
                            {pair.wordA} ⇄ {pair.wordB}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-mono font-semibold pl-1">
                          ✓ {pair.correctCount}x
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-1">
              {showResetConfirm ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetStats}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Ya, Reset
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset Statistik</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab('game')}
                className="px-4 py-1.5 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Lanjut Main</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
