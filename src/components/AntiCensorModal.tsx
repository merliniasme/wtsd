import React, { useState, useMemo, useEffect } from 'react';
import { Word } from '../types';
import {
  ESCAPE_MODES,
  EscapeMode,
  escapeCensoredWord,
  inspectTransformation,
  copyToClipboard,
} from '../utils/homoglyph';
import {
  analyzeText,
  AnalyzedChar,
  TextAnalysisResult,
  containsNonLatinChars,
} from '../utils/charAnalyzer';
import {
  X,
  Copy,
  Check,
  VenetianMask,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Clipboard,
  RotateCcw,
  CheckCircle2,
  ScanSearch,
  AlertTriangle,
  FileSearch,
  HelpCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export type AntiCensorModalTab = 'analyze' | 'escape';

interface AntiCensorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWord?: string;
  initialTab?: AntiCensorModalTab;
  words?: Word[];
  onNotify?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const AntiCensorModal: React.FC<AntiCensorModalProps> = ({
  isOpen,
  onClose,
  initialWord = '',
  initialTab = 'analyze',
  words = [],
  onNotify,
}) => {
  const [activeTab, setActiveTab] = useState<AntiCensorModalTab>(initialTab);
  const [inputText, setInputText] = useState(initialWord);
  const [selectedCharIndex, setSelectedCharIndex] = useState<number | null>(null);

  // Escape mode states
  const [selectedMode, setSelectedMode] = useState<EscapeMode>('cyrillic');
  const [copiedTransformed, setCopiedTransformed] = useState(false);
  const [copiedCleaned, setCopiedCleaned] = useState(false);
  const [copiedNormal, setCopiedNormal] = useState(false);

  // Sync initialWord & initialTab when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      if (initialWord) {
        setInputText(initialWord);
        // If word contains suspicious/non-Latin characters, default to analyze
        if (containsNonLatinChars(initialWord)) {
          setActiveTab('analyze');
        } else if (initialTab) {
          setActiveTab(initialTab);
        }
      } else if (initialTab) {
        setActiveTab(initialTab);
      }
      setSelectedCharIndex(null);
    }
  }, [isOpen, initialWord, initialTab]);

  // Full Analysis
  const analysis: TextAnalysisResult = useMemo(() => {
    return analyzeText(inputText);
  }, [inputText]);

  // Selected character detail for inspection
  const selectedChar: AnalyzedChar | null = useMemo(() => {
    if (selectedCharIndex === null || !analysis.analyzedChars[selectedCharIndex]) {
      // Default to first non-latin character if available
      const firstNonLatinIdx = analysis.analyzedChars.findIndex((c) => !c.isStandardLatin);
      if (firstNonLatinIdx !== -1) {
        return analysis.analyzedChars[firstNonLatinIdx];
      }
      return analysis.analyzedChars[0] || null;
    }
    return analysis.analyzedChars[selectedCharIndex];
  }, [selectedCharIndex, analysis]);

  // Escape Transformation
  const transformedEscapeText = useMemo(() => {
    return escapeCensoredWord(inputText, selectedMode);
  }, [inputText, selectedMode]);

  const escapeCharDetails = useMemo(() => {
    return inspectTransformation(inputText, selectedMode);
  }, [inputText, selectedMode]);

  const escapeReplacedCount = useMemo(() => {
    return escapeCharDetails.filter((c) => c.isReplaced).length;
  }, [escapeCharDetails]);

  // Copy Cleaned Latin Text
  const handleCopyCleaned = async () => {
    if (!analysis.cleanedText) return;
    const success = await copyToClipboard(analysis.cleanedText);
    if (success) {
      setCopiedCleaned(true);
      if (onNotify) {
        onNotify(`Disalin teks Latin murni: "${analysis.cleanedText}"`, 'success');
      }
      setTimeout(() => setCopiedCleaned(false), 1500);
    }
  };

  // Copy Transformed Text (Escape tab)
  const handleCopyTransformed = async () => {
    if (!transformedEscapeText) return;
    const success = await copyToClipboard(transformedEscapeText);
    if (success) {
      setCopiedTransformed(true);
      if (onNotify) {
        onNotify(`Disalin dengan Homoglif Sirilik: "${transformedEscapeText}"`, 'success');
      }
      setTimeout(() => setCopiedTransformed(false), 1500);
    }
  };

  // Copy Raw Normal
  const handleCopyNormal = async () => {
    if (!inputText) return;
    const success = await copyToClipboard(inputText);
    if (success) {
      setCopiedNormal(true);
      if (onNotify) {
        onNotify(`Disalin kata asli: "${inputText}"`, 'info');
      }
      setTimeout(() => setCopiedNormal(false), 1500);
    }
  };

  // Paste from clipboard
  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          setInputText(text);
          setSelectedCharIndex(null);
        }
      }
    } catch {
      // Ignore clipboard read permission error
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="anti-censor-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        id="anti-censor-modal-dialog"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl flex flex-col shadow-2xl overflow-hidden max-h-[94vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
              {activeTab === 'analyze' ? (
                <ScanSearch className="w-4 h-4 text-amber-400" />
              ) : (
                <VenetianMask className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 leading-tight">
                {activeTab === 'analyze'
                  ? 'Analisis Karakter Non-Latin'
                  : 'Anti-Sensor Homoglif Sirilik'}
              </h2>
              <p className="text-[11px] text-slate-400">
                {activeTab === 'analyze'
                  ? 'Deteksi huruf non-Latin, homoglif Rusia, dan karakter tak terlihat'
                  : 'Ubah huruf Latin ke Sirilik Rusia untuk lolos sensor kata'}
              </p>
            </div>
          </div>

          <button
            id="btn-close-anti-censor"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-5 pt-2 gap-2 shrink-0">
          <button
            type="button"
            id="tab-btn-analyze"
            onClick={() => setActiveTab('analyze')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'analyze'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ScanSearch className="w-3.5 h-3.5" />
            <span>Analisis Non-Latin</span>
            {analysis.hasNonLatin && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40">
                {analysis.nonLatinCount}
              </span>
            )}
          </button>

          <button
            type="button"
            id="tab-btn-escape"
            onClick={() => setActiveTab('escape')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'escape'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <VenetianMask className="w-3.5 h-3.5" />
            <span>Samarkan Kata (Escape)</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Universal Text Input Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <label htmlFor="anti-censor-input" className="font-semibold flex items-center gap-1.5">
                <span>Kata atau Teks yang Diperiksa</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePaste}
                  className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Tempel dari Clipboard"
                >
                  <Clipboard className="w-3 h-3" />
                  <span>Tempel</span>
                </button>
                {inputText && (
                  <button
                    type="button"
                    onClick={() => {
                      setInputText('');
                      setSelectedCharIndex(null);
                    }}
                    className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <input
                id="anti-censor-input"
                type="text"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  setSelectedCharIndex(null);
                }}
                placeholder="Ketik atau tempel kata yang dicurigai mengandung karakter non-Latin..."
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
              />
            </div>

            {/* Quick Presets / Test Samples */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1 text-[10px] text-slate-500">
                <span>Pilih cepat contoh atau kata kamus:</span>
                <span className="italic">Klik untuk uji</span>
              </div>
              <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1">
                {/* Interesting Non-Latin Testing Samples */}
                <button
                  type="button"
                  onClick={() => {
                    // "Mаtаhаrі" with Cyrillic 'а', 'і'
                    setInputText('M\u0430t\u0430h\u0430r\u0456');
                    setSelectedCharIndex(null);
                  }}
                  className="text-[10px] px-2 py-0.5 rounded-md border border-rose-500/40 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 cursor-pointer"
                  title="Contoh: Matahari dengan huruf 'a' dan 'i' Sirilik Rusia"
                >
                  ⚡ Mаtаhаrі (Sirilik)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    // "K‌u‌c‌i‌n‌g" with invisible ZWNJ
                    setInputText('K\u200Cu\u200Cc\u200Ci\u200Cn\u200Cg');
                    setSelectedCharIndex(null);
                  }}
                  className="text-[10px] px-2 py-0.5 rounded-md border border-purple-500/40 bg-purple-950/30 text-purple-300 hover:bg-purple-900/40 cursor-pointer"
                  title="Contoh: Kucing dengan Zero-Width Non-Joiner tak terlihat"
                >
                  ⚡ K‌u‌c‌i‌n‌g (ZWNJ)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInputText('P\u043El\u0456\u0455\u0456');
                    setSelectedCharIndex(null);
                  }}
                  className="text-[10px] px-2 py-0.5 rounded-md border border-rose-500/40 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 cursor-pointer"
                  title="Contoh: Polisi dengan huruf Sirilik Rusia"
                >
                  ⚡ Pоlіѕі (Rusia)
                </button>

                {/* Words from user dictionary */}
                {words.slice(0, 6).map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      setInputText(w.term);
                      setSelectedCharIndex(null);
                    }}
                    className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                      inputText === w.term
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-semibold'
                        : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {w.term}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* TAB 1: ANALISIS NON-LATIN */}
          {activeTab === 'analyze' && (
            <div className="space-y-4">
              {/* Verdict Summary Card */}
              {inputText.trim() ? (
                <div
                  id="analyzer-verdict-card"
                  className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                    analysis.verdict === 'suspicious-disguise'
                      ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                      : analysis.verdict === 'clean-latin'
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {analysis.verdict === 'suspicious-disguise' ? (
                      <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
                    ) : analysis.verdict === 'clean-latin' ? (
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs sm:text-sm font-bold tracking-tight">
                        {analysis.verdictTitle}
                      </h4>
                      <span
                        className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded font-bold ${
                          analysis.verdict === 'suspicious-disguise'
                            ? 'bg-rose-500 text-slate-950'
                            : analysis.verdict === 'clean-latin'
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-amber-500 text-slate-950'
                        }`}
                      >
                        {analysis.verdict === 'clean-latin' ? 'Aman' : 'Perlu Diwaspadai'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {analysis.verdictDescription}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                  Ketik atau tempel kata di atas untuk menganalisis karakter non-Latin, homoglif, dan byte tersembunyi.
                </div>
              )}

              {/* Statistics Breakdown Counters */}
              {inputText.trim() && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Total Karakter</span>
                    <span className="text-lg font-bold text-slate-100">
                      {analysis.totalChars}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] text-emerald-400 block">Latin Standar</span>
                    <span className="text-lg font-bold text-emerald-400">
                      {analysis.standardLatinCount}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] text-rose-400 block">Homoglif Menyamar</span>
                    <span className="text-lg font-bold text-rose-400">
                      {analysis.homoglyphCount}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                    <span className="text-[10px] text-purple-400 block">Tak Kasat Mata</span>
                    <span className="text-lg font-bold text-purple-400">
                      {analysis.invisibleCount}
                    </span>
                  </div>
                </div>
              )}

              {/* Interactive Character Map / Strip */}
              {inputText.trim() && (
                <div className="space-y-2 bg-slate-950/90 border border-slate-800 rounded-xl p-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                      <FileSearch className="w-3.5 h-3.5 text-amber-400" />
                      <span>Peta Karakter per Huruf</span>
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Klik karakter untuk rincian Unicode
                    </span>
                  </div>

                  {/* Character Pills Strip */}
                  <div className="flex flex-wrap gap-1.5 p-2 bg-slate-900 rounded-lg border border-slate-800/80 max-h-36 overflow-y-auto">
                    {analysis.analyzedChars.map((ch, idx) => {
                      const isSelected = selectedCharIndex === idx;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedCharIndex(idx)}
                          className={`px-2 py-1 rounded-md border text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                            ch.badgeColor
                          } ${
                            isSelected
                              ? 'ring-2 ring-amber-400 scale-105 shadow-md'
                              : 'hover:brightness-125'
                          }`}
                          title={`${ch.description} (${ch.hex})`}
                        >
                          <span className="text-sm">{ch.displayChar}</span>
                          {!ch.isStandardLatin && !ch.isWhitespace && (
                            <span className="text-[9px] opacity-75 font-normal">
                              {ch.hex}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Character Deep Inspector Box */}
                  {selectedChar && (
                    <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-amber-300">
                            {selectedChar.displayChar}
                          </span>
                          <div>
                            <span className="font-bold text-slate-200 block">
                              {selectedChar.categoryLabel}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {selectedChar.hex} (Kode Desimal: {selectedChar.codePoint})
                            </span>
                          </div>
                        </div>

                        {selectedChar.mimicsLatin && (
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">
                              Menyamari Huruf:
                            </span>
                            <span className="font-mono font-bold text-sm text-emerald-400">
                              '{selectedChar.mimicsLatin}' (Latin)
                            </span>
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800/80">
                        {selectedChar.description}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Clean Normalized Latin Preview & Action */}
              {inputText.trim() && (
                <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Hasil Pembersihan ke Latin Murni:</span>
                    </span>
                    {analysis.hasNonLatin && (
                      <span className="text-[10px] text-slate-400">
                        Homoglif dikembalikan & karakter tersembunyi dihapus
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between gap-3">
                    <span className="text-base sm:text-lg font-bold text-slate-100 font-sans break-all select-all">
                      {analysis.cleanedText || <em className="text-slate-600">Kosong</em>}
                    </span>

                    <button
                      type="button"
                      onClick={handleCopyCleaned}
                      disabled={!analysis.cleanedText}
                      className="shrink-0 p-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-transform active:scale-95 cursor-pointer shadow-sm flex items-center gap-1.5 text-xs disabled:opacity-40"
                      title="Salin kata yang sudah dinormalisasi ke Latin murni"
                    >
                      {copiedCleaned ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Latin Bersih</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Quick Switch to Escape Mode with this word */}
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Ingin menyamarkan kata ini untuk filter?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (analysis.cleanedText) {
                          setInputText(analysis.cleanedText);
                        }
                        setActiveTab('escape');
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Buka di Tab Penyamaran</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SAMARKAN KATA (ESCAPE SENSOR) */}
          {activeTab === 'escape' && (
            <div className="space-y-4">
              {/* Mode Selector */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-slate-300 block">
                  Metode Penyamaran Homoglif:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {ESCAPE_MODES.map((m) => {
                    const isSelected = selectedMode === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMode(m.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500/60 text-amber-200'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold">{m.name}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950 font-bold'
                                : 'bg-slate-700 text-slate-400'
                            }`}
                          >
                            {m.badge}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                          {m.shortDesc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Transformed Result Box */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-3 relative overflow-hidden">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Hasil Teks Homoglif:</span>
                  </span>

                  {inputText.trim() && (
                    <span className="text-[11px] font-mono text-slate-400">
                      {escapeReplacedCount} huruf diganti
                    </span>
                  )}
                </div>

                {/* Display Text Box */}
                <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg min-h-[50px] flex items-center justify-between gap-3">
                  <span className="text-lg sm:text-xl font-bold text-white break-all select-all font-sans">
                    {transformedEscapeText || (
                      <em className="text-slate-600 text-sm font-normal">Ketik kata di atas...</em>
                    )}
                  </span>

                  {transformedEscapeText && (
                    <button
                      type="button"
                      onClick={handleCopyTransformed}
                      className="shrink-0 p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-transform active:scale-95 cursor-pointer shadow-sm flex items-center gap-1.5 text-xs"
                      title="Salin Teks Anti-Sensor"
                    >
                      {copiedTransformed ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Action to Analyze this generated result */}
                {transformedEscapeText && (
                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Ingin membedah kode Unicode hasil ini?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setInputText(transformedEscapeText);
                        setActiveTab('analyze');
                      }}
                      className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <ScanSearch className="w-3.5 h-3.5" />
                      <span>Analisis Hasil Ini</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-900 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleCopyNormal}
            disabled={!inputText.trim()}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            title="Salin kata dalam format biasa"
          >
            {copiedNormal ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>Salin Asli</span>
          </button>

          {activeTab === 'analyze' ? (
            <button
              id="btn-copy-clean-latin-primary"
              type="button"
              onClick={handleCopyCleaned}
              disabled={!analysis.cleanedText}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer transition-transform disabled:opacity-40"
            >
              {copiedCleaned ? (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Latin Bersih Tersalin!</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Salin Latin Bersih</span>
                </>
              )}
            </button>
          ) : (
            <button
              id="btn-copy-anti-censor-primary"
              type="button"
              onClick={handleCopyTransformed}
              disabled={!transformedEscapeText}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer transition-transform disabled:opacity-40"
            >
              {copiedTransformed ? (
                <>
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Berhasil Disalin!</span>
                </>
              ) : (
                <>
                  <VenetianMask className="w-4 h-4" />
                  <span>Salin Teks Anti-Sensor</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
