import React, { useState, useMemo } from 'react';
import { Word } from '../types';
import {
  ESCAPE_MODES,
  EscapeMode,
  escapeCensoredWord,
  inspectTransformation,
  copyToClipboard,
  CYRILLIC_HOMOGLYPH_MAP,
} from '../utils/homoglyph';
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
  Info,
  CheckCircle2,
} from 'lucide-react';

interface AntiCensorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWord?: string;
  words?: Word[];
  onNotify?: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const AntiCensorModal: React.FC<AntiCensorModalProps> = ({
  isOpen,
  onClose,
  initialWord = '',
  words = [],
  onNotify,
}) => {
  const [inputText, setInputText] = useState(initialWord);
  const [selectedMode, setSelectedMode] = useState<EscapeMode>('cyrillic');
  const [copied, setCopied] = useState(false);
  const [copiedNormal, setCopiedNormal] = useState(false);

  // Sync initialWord when changed or modal opened
  React.useEffect(() => {
    if (initialWord) {
      setInputText(initialWord);
    }
  }, [initialWord, isOpen]);

  // Transformed string
  const transformedText = useMemo(() => {
    return escapeCensoredWord(inputText, selectedMode);
  }, [inputText, selectedMode]);

  // Character-by-character analysis
  const charDetails = useMemo(() => {
    return inspectTransformation(inputText, selectedMode);
  }, [inputText, selectedMode]);

  const replacedCount = useMemo(() => {
    return charDetails.filter((c) => c.isReplaced).length;
  }, [charDetails]);

  // Handle Copy Transformed (Homoglyph)
  const handleCopyTransformed = async () => {
    if (!transformedText) return;
    const success = await copyToClipboard(transformedText);
    if (success) {
      setCopied(true);
      if (onNotify) {
        onNotify(`Disalin dengan Homoglif Sirilik: "${transformedText}"`, 'success');
      }
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // Handle Copy Normal
  const handleCopyNormal = async () => {
    if (!inputText) return;
    const success = await copyToClipboard(inputText);
    if (success) {
      setCopiedNormal(true);
      if (onNotify) {
        onNotify(`Disalin teks biasa: "${inputText}"`, 'info');
      }
      setTimeout(() => setCopiedNormal(false), 1500);
    }
  };

  // Paste from clipboard
  const handlePaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) setInputText(text);
      }
    } catch {
      // Ignore clipboard read permission error
    }
  };

  if (!isOpen) return null;

  const isBypassed = inputText.trim() !== '' && transformedText !== inputText;

  return (
    <div
      id="anti-censor-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div
        id="anti-censor-modal-dialog"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-900 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
              <VenetianMask className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-100 leading-tight">
                Anti-Sensor Homoglif
              </h2>
              <p className="text-[11px] text-slate-400">
                Ubah huruf Latin ke Sirilik Rusia untuk lolos filter sensor
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

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Input Word / Phrase Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <label htmlFor="anti-censor-input" className="font-semibold flex items-center gap-1.5">
                <span>Kata atau Kalimat Target</span>
              </label>
              <div className="flex items-center gap-1.5">
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
                    onClick={() => setInputText('')}
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
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ketik kata yang ingin disamarkan (contoh: Kucing, Polisi, Bom)..."
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
              />
            </div>

            {/* Quick Pick Chips from Dictionary */}
            {words.length > 0 && (
              <div className="pt-1">
                <span className="text-[10px] text-slate-500 block mb-1">
                  Pilih cepat dari kamus:
                </span>
                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1">
                  {words.slice(0, 10).map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setInputText(w.term)}
                      className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
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
            )}
          </div>

          {/* Mode Selector */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-300 block">
              Metode Penyamaran:
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
                  {replacedCount} huruf diganti
                </span>
              )}
            </div>

            {/* Display Text Box */}
            <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-lg min-h-[50px] flex items-center justify-between gap-3">
              <span className="text-lg sm:text-xl font-bold text-white break-all select-all font-sans">
                {transformedText || <em className="text-slate-600 text-sm font-normal">Ketik kata di atas...</em>}
              </span>

              {transformedText && (
                <button
                  type="button"
                  onClick={handleCopyTransformed}
                  className="shrink-0 p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-transform active:scale-95 cursor-pointer shadow-sm flex items-center gap-1.5 text-xs"
                  title="Salin Teks Anti-Sensor"
                >
                  {copied ? (
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

            {/* Censorship Bypass Verification Pill */}
            {inputText.trim() && (
              <div
                className={`p-2.5 rounded-lg border flex items-start gap-2 text-xs ${
                  isBypassed
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                }`}
              >
                {isBypassed ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold block">
                    {isBypassed
                      ? 'Lolos Sensor: Teks berhasil disamarkan!'
                      : 'Belum ada karakter yang tersamarkan'}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isBypassed
                      ? 'Filter kata otomatis (ASCII / Latin Regex) tidak akan mengenali kata ini, tetapi mata manusia tetap membaca kata yang sama dengan normal.'
                      : 'Kata ini tidak mengandung huruf Latin yang memiliki padanan Sirilik identik. Coba pilih metode "Pemisah Tak Terlihat (ZWNJ)".'}
                  </p>
                </div>
              </div>
            )}

            {/* Character Breakdown Details */}
            {inputText.trim() && charDetails.length > 0 && (
              <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-400 block">
                  Rincian Karakter Unicode:
                </span>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                  {charDetails.map((detail, idx) => (
                    <div
                      key={idx}
                      className={`px-1.5 py-1 rounded text-[10px] font-mono border flex items-center gap-1 ${
                        detail.isReplaced
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                      title={`${detail.description}: ${detail.unicodeHex}`}
                    >
                      <span>{detail.transformed}</span>
                      <span className="text-[9px] opacity-75">{detail.unicodeHex}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
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
            {copiedNormal ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Salin Biasa (Latin)</span>
          </button>

          <button
            id="btn-copy-anti-censor-primary"
            type="button"
            onClick={handleCopyTransformed}
            disabled={!transformedText}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer transition-transform disabled:opacity-40"
          >
            {copied ? (
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
        </div>
      </div>
    </div>
  );
};
