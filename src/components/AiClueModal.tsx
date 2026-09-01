import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, X, Copy, Check, RefreshCw, AlertCircle, ArrowRight, Lightbulb, CheckCircle2 } from 'lucide-react';
import { RelationTag, TAG_METADATA } from '../types';

interface AiClueData {
  clue: string;
  validationWord1: string;
  validationWord2: string;
  description?: string;
}

interface AiClueModalProps {
  isOpen: boolean;
  onClose: () => void;
  word1: string;
  word2: string;
  tag?: RelationTag;
  onCopyToast?: (text: string) => void;
}

export const AiClueModal: React.FC<AiClueModalProps> = ({
  isOpen,
  onClose,
  word1,
  word2,
  tag,
  onCopyToast,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AiClueData | null>(null);
  const [copiedClue, setCopiedClue] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const fetchClue = useCallback(async () => {
    if (!word1 || !word2) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/clue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word1, word2 }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal membuat clue AI. Silakan coba lagi.');
      }

      setData({
        clue: json.clue,
        validationWord1: json.validationWord1,
        validationWord2: json.validationWord2,
        description: json.description,
      });
    } catch (err: any) {
      console.error('AI Clue fetch error:', err);
      setError(err?.message || 'Terjadi kesalahan saat menghubungi Gemini AI.');
    } finally {
      setLoading(false);
    }
  }, [word1, word2]);

  // Trigger clue generation when modal opens with new words
  useEffect(() => {
    if (isOpen && word1 && word2) {
      setData(null);
      fetchClue();
    }
  }, [isOpen, word1, word2, fetchClue]);

  if (!isOpen) return null;

  const meta = tag ? TAG_METADATA[tag] || TAG_METADATA.others : null;

  const handleCopyClue = () => {
    if (!data?.clue) return;
    navigator.clipboard.writeText(data.clue);
    setCopiedClue(true);
    if (onCopyToast) onCopyToast(`Clue disalin: "${data.clue}"`);
    setTimeout(() => setCopiedClue(false), 1500);
  };

  const handleCopyFull = () => {
    if (!data) return;
    const fullText = `💡 Clue: "${data.clue}"\n\n📌 Cabang Validasi:\n• ${word1}: ${data.validationWord1}\n• ${word2}: ${data.validationWord2}${data.description ? `\n\n📝 Catatan: ${data.description}` : ''}`;
    navigator.clipboard.writeText(fullText);
    setCopiedAll(true);
    if (onCopyToast) onCopyToast('Seluruh detail clue & validasi disalin!');
    setTimeout(() => setCopiedAll(false), 1500);
  };

  return (
    <div
      id="ai-clue-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        id="ai-clue-modal-dialog"
        className="bg-[#1E293B] border border-[#334155] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-[#334155] flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>AI Generated Clue</span>
                {meta && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${meta.badgeBg} ${meta.badgeText} border ${meta.badgeBorder}`}
                  >
                    {meta.shortCode} • {meta.label}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Clue seimbang & cabang validasi untuk Undercover
              </p>
            </div>
          </div>

          <button
            id="btn-close-ai-clue-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Word Pair Target Header */}
        <div className="px-4 py-3 bg-[#0F172A] border-b border-[#334155]/60 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-medium">
            <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-sky-300 font-semibold">
              {word1}
            </span>
            <span className="text-slate-500 font-mono">⇄</span>
            <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-sky-300 font-semibold">
              {word2}
            </span>
          </div>

          <button
            onClick={fetchClue}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
            title="Generate clue baru"
          >
            <RefreshCw className={`w-3 h-3 text-sky-400 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Membuat...' : 'Regenerate'}</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {loading && (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center mx-auto text-sky-400 animate-pulse">
                <Sparkles className="w-5 h-5 animate-spin" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-200">
                  Menganalisa korelasi "{word1}" & "{word2}"...
                </p>
                <p className="text-[11px] text-slate-400">
                  Meracik clue yang tidak umum & detail masing-masing cabang validasi
                </p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">Gagal memuat clue</p>
                  <p className="text-rose-300/80 text-[11px] mt-0.5">{error}</p>
                </div>
              </div>
              <button
                onClick={fetchClue}
                className="w-full py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded text-rose-200 font-medium transition-colors cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          )}

          {data && !loading && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Clue Box */}
              <div className="p-4 rounded-xl bg-gradient-to-b from-sky-950/40 to-slate-900 border border-sky-500/30 space-y-2 relative group">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5" />
                    AI Clue (Petunjuk)
                  </span>
                  <button
                    onClick={handleCopyClue}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 transition-colors cursor-pointer"
                  >
                    {copiedClue ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-300 font-semibold">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Salin Clue</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-base font-semibold text-slate-100 bg-[#0F172A]/80 p-3 rounded-lg border border-[#334155]/60 font-sans tracking-wide">
                  "{data.clue}"
                </div>
              </div>

              {/* Validation Branches Section */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Detail Cabang Validasi
                </h4>

                <div className="grid grid-cols-1 gap-2.5">
                  {/* Branch Word 1 */}
                  <div className="p-3 rounded-lg bg-[#0F172A] border border-[#334155] space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                      <span>Validasi ke "{word1}"</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pl-3">
                      {data.validationWord1}
                    </p>
                  </div>

                  {/* Branch Word 2 */}
                  <div className="p-3 rounded-lg bg-[#0F172A] border border-[#334155] space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                      <span>Validasi ke "{word2}"</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pl-3">
                      {data.validationWord2}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description & Strategy Note */}
              {data.description && (
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-1">
                  <span className="font-semibold text-slate-300 text-[11px] block">
                    Karakteristik Clue:
                  </span>
                  <p className="leading-relaxed">{data.description}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-[#334155] bg-slate-900/60 flex items-center justify-between gap-2">
          {data ? (
            <button
              onClick={handleCopyFull}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-[#334155] font-medium transition-colors cursor-pointer"
            >
              {copiedAll ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Detail Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Semua (Clue & Validasi)</span>
                </>
              )}
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-semibold text-xs transition-colors cursor-pointer shadow-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
