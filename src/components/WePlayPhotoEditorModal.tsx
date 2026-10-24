import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Word, WePlayAnalysisResult, WePlayEditorOptions } from '../types';
import {
  analyzeWePlayScreenshot,
  renderEditedWePlayCanvas,
  downloadEditedImage,
  copyCanvasImageToClipboard,
  loadImageElement,
  fileToBase64,
} from '../utils/weplayImageEditor';
import sampleWePlayImage from '../assets/images/weplay_spy_screenshot_1788739727093.jpg';
import {
  X,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Download,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Type,
  Maximize2,
  ArrowRightLeft,
  VenetianMask,
  FileImage,
  Eye,
  RotateCcw,
  Search,
} from 'lucide-react';

interface WePlayPhotoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  words: Word[];
  initialTargetWord?: string;
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const WePlayPhotoEditorModal: React.FC<WePlayPhotoEditorModalProps> = ({
  isOpen,
  onClose,
  words,
  initialTargetWord = '',
  onToast,
}) => {
  // Image states
  const [sourceImageElement, setSourceImageElement] = useState<HTMLImageElement | null>(null);
  const [sourceBase64, setSourceBase64] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [imageFileName, setImageFileName] = useState<string>('weplay_screenshot.jpg');

  // AI Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<WePlayAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Target word selection state
  const [replacementWord, setReplacementWord] = useState<string>(initialTargetWord || '');
  const [wordSearchFilter, setWordSearchFilter] = useState<string>('');
  const [isWordDropdownOpen, setIsWordDropdownOpen] = useState<boolean>(false);

  // Editor options state
  const [editorOptions, setEditorOptions] = useState<WePlayEditorOptions>({
    replacementWord: initialTargetWord || 'TEH',
    box2d: [450, 260, 550, 740],
    textColor: '#2C1805',
    cardBgColor: '#FFD54F',
    blendMode: 'auto_sample',
    fontSizeScale: 1.0,
    fontWeight: 'bold',
    hasOutline: false,
    strokeColor: '#FFFFFF',
    hasShadow: false,
    textTransform: 'uppercase',
    featherRadius: 2,
    xOffset: 0,
    yOffset: 0,
    useHomoglyph: false,
  });

  // Rendered Output states
  const [editedDataUrl, setEditedDataUrl] = useState<string>('');
  const [lastCanvas, setLastCanvas] = useState<HTMLCanvasElement | null>(null);
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Set initial word if passed
  useEffect(() => {
    if (initialTargetWord) {
      setReplacementWord(initialTargetWord);
      setEditorOptions((prev) => ({ ...prev, replacementWord: initialTargetWord }));
    }
  }, [initialTargetWord]);

  // Handle Clipboard Paste (Ctrl+V anywhere in modal)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            handleProcessFile(file);
            onToast('Screenshot berhasil ditempel dari clipboard!', 'success');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, onToast]);

  // Process uploaded image file
  const handleProcessFile = async (file: File) => {
    try {
      setImageFileName(file.name || 'weplay_screenshot.jpg');
      const { base64, mimeType: detectedMime } = await fileToBase64(file);
      setSourceBase64(base64);
      setMimeType(detectedMime);

      const img = await loadImageElement(file);
      setSourceImageElement(img);

      // Trigger AI Analysis
      runAiAnalysis(base64, detectedMime, img);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onToast(`Gagal memuat gambar: ${msg}`, 'error');
    }
  };

  // Load sample WePlay screenshot
  const handleLoadSample = async () => {
    try {
      setImageFileName('sample_weplay_who_is_the_spy.jpg');
      const res = await fetch(sampleWePlayImage);
      const blob = await res.blob();
      const file = new File([blob], 'sample_weplay_who_is_the_spy.jpg', { type: 'image/jpeg' });
      handleProcessFile(file);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onToast(`Gagal memuat contoh screenshot: ${msg}`, 'error');
    }
  };

  // Run AI Analysis on screenshot
  const runAiAnalysis = async (
    base64Str: string,
    mime: string,
    imgElement: HTMLImageElement
  ) => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const analysis = await analyzeWePlayScreenshot(base64Str, mime);
      setAnalysisResult(analysis);

      // Populate initial editor options from AI findings
      const targetWord = replacementWord || (analysis.detectedWord === 'KOPI' ? 'TEH' : 'ESPRESSO');
      if (!replacementWord) {
        setReplacementWord(targetWord);
      }

      setEditorOptions((prev) => ({
        ...prev,
        replacementWord: targetWord,
        box2d: analysis.box2d,
        textColor: analysis.textColor || prev.textColor,
        cardBgColor: analysis.cardBgColor || prev.cardBgColor,
        fontWeight: analysis.fontWeight || 'bold',
        hasOutline: analysis.hasOutlineOrStroke || false,
        strokeColor: analysis.strokeColor || '#FFFFFF',
        hasShadow: analysis.hasShadow || false,
        textTransform: (analysis.textTransform as any) || 'uppercase',
      }));

      onToast(
        analysis.isWePlayOrSpyGame
          ? `Screenshot WePlay terverifikasi! Terdeteksi kata "${analysis.detectedWord || 'Rahasia'}".`
          : `Kata "${analysis.detectedWord || 'Rahasia'}" terdeteksi.`,
        'success'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAnalysisError(msg);
      // Even if AI call failed, provide default center box so user can still edit
      const fallbackBox: [number, number, number, number] = [460, 260, 540, 740];
      setEditorOptions((prev) => ({ ...prev, box2d: fallbackBox }));
      onToast(`AI Vision: ${msg}. Anda masih dapat menyesuaikan posisi kata secara manual.`, 'info');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Re-render canvas whenever source image or editor options change
  useEffect(() => {
    if (!sourceImageElement) return;

    try {
      const updatedOpts: WePlayEditorOptions = {
        ...editorOptions,
        replacementWord,
      };
      const result = renderEditedWePlayCanvas(sourceImageElement, updatedOpts);
      setEditedDataUrl(result.dataUrl);
      setLastCanvas(result.canvas);
    } catch (err) {
      console.error('Error rendering edited WePlay canvas:', err);
    }
  }, [sourceImageElement, editorOptions, replacementWord]);

  // Handle Download
  const handleDownload = () => {
    if (!editedDataUrl) return;
    const cleanWord = replacementWord.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') || 'word';
    const filename = `weplay_spy_${cleanWord}.png`;
    downloadEditedImage(editedDataUrl, filename);
    onToast(`Foto berhasil diunduh (${filename})`, 'success');
  };

  // Handle Copy to Clipboard
  const handleCopyClipboard = async () => {
    if (!lastCanvas) return;
    const ok = await copyCanvasImageToClipboard(lastCanvas);
    if (ok) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      onToast('Gambar berhasil disalin ke clipboard! Siap dipaste ke chat/WhatsApp.', 'success');
    } else {
      onToast('Gagal menyalin gambar langsung. Silakan gunakan tombol Unduh.', 'error');
    }
  };

  // Quick Pair Swap if detected word exists in dictionary
  const linkedPairWords = React.useMemo(() => {
    if (!analysisResult?.detectedWord) return [];
    const lower = analysisResult.detectedWord.toLowerCase().trim();
    const found = words.find((w) => w.term.toLowerCase() === lower);
    if (!found) return [];

    const relatedTerms: string[] = [];
    for (const rel of found.relations) {
      const target = words.find((w) => w.id === rel.targetWordId);
      if (target && !relatedTerms.includes(target.term)) {
        relatedTerms.push(target.term);
      }
    }
    return relatedTerms;
  }, [analysisResult, words]);

  // Filtered dictionary words for dropdown
  const filteredWords = React.useMemo(() => {
    const q = wordSearchFilter.trim().toLowerCase();
    if (!q) return words.slice(0, 30);
    return words.filter((w) => w.term.toLowerCase().includes(q)).slice(0, 40);
  }, [words, wordSearchFilter]);

  if (!isOpen) return null;

  return (
    <div
      id="weplay-photo-editor-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto"
    >
      <div
        className="bg-[#112240] border border-[#233554] w-full max-w-4xl rounded-xl shadow-sm overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[#233554] bg-[#0A192F]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00D2FF]/15 border border-[#00D2FF]/30 text-[#00D2FF] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-[#F8FAFC] tracking-tight">
                  AI Screenshot WePlay Editor
                </h2>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Who's the Spy
                </span>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                Ganti kata peran di screenshot game WePlay secara otomatis & autentik
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#1E293B] rounded-lg transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Upload Zone (If no image loaded yet) */}
          {!sourceImageElement ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) handleProcessFile(file);
              }}
              className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all ${
                isDraggingOver
                  ? 'border-[#00D2FF] bg-[#00D2FF]/10'
                  : 'border-[#233554] bg-[#080F1E] hover:border-[#38BDF8]/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleProcessFile(file);
                }}
              />

              <div className="max-w-md mx-auto space-y-4">
                <div className="w-14 h-14 mx-auto rounded-xl bg-[#00D2FF]/10 border border-[#00D2FF]/20 text-[#00D2FF] flex items-center justify-center">
                  <ImageIcon className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="text-base font-bold text-[#F8FAFC] tracking-tight">
                    Upload Screenshot WePlay Who's the Spy
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Tarik dan lepas screenshot kartu kata / room WePlay di sini, atau paste langsung dari clipboard (<code className="bg-[#112240] px-1 py-0.5 rounded text-[#00D2FF]">Ctrl + V</code>).
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#00D2FF] hover:bg-[#38BDF8] text-[#0A192F] font-semibold text-xs rounded-lg transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Pilih Foto Screenshot</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#112240] hover:bg-[#1E293B] text-[#F8FAFC] text-xs font-medium rounded-lg border border-[#233554] transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Gunakan Contoh WePlay</span>
                  </button>
                </div>

                <div className="text-[11px] text-[#94A3B8] pt-2 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mendukung kartu kata kuning, kartu rahasia civilian/undercover & meja diskus WePlay.</span>
                </div>
              </div>
            </div>
          ) : (
            /* Main Interactive Workspace */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Image Canvas Preview (7 cols) */}
              <div className="lg:col-span-7 flex flex-col space-y-3">
                {/* Preview Toolbar */}
                <div className="flex items-center justify-between text-xs text-[#94A3B8] bg-[#0A192F] px-3 py-2 rounded-lg border border-[#233554]">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#F8FAFC] truncate max-w-[160px]">
                      {imageFileName}
                    </span>
                    {analysisResult?.isWePlayOrSpyGame && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                        WePlay Verified
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowOriginal(!showOriginal)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                        showOriginal
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#112240]'
                      }`}
                      title="Tahan untuk melihat screenshot asli sebelum diedit"
                    >
                      <Eye className="w-3 h-3" />
                      <span>{showOriginal ? 'Melihat Asli' : 'Bandingkan Asli'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSourceImageElement(null);
                        setAnalysisResult(null);
                      }}
                      className="text-[#94A3B8] hover:text-[#F8FAFC] text-[11px] hover:underline cursor-pointer"
                    >
                      Ganti Foto
                    </button>
                  </div>
                </div>

                {/* Canvas Container */}
                <div
                  ref={previewContainerRef}
                  className="relative flex-1 min-h-[380px] max-h-[500px] bg-slate-950/80 rounded-2xl border border-[#334155] flex items-center justify-center p-2 overflow-hidden"
                >
                  {isAnalyzing && (
                    <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2.5 text-center p-4">
                      <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
                      <div className="text-sm font-semibold text-slate-100">
                        AI sedang membaca screenshot WePlay...
                      </div>
                      <div className="text-xs text-slate-400 max-w-xs">
                        Mendeteksi posisi kartu kata, warna latar, font, dan teks rahasia...
                      </div>
                    </div>
                  )}

                  {showOriginal && sourceImageElement ? (
                    <img
                      src={sourceBase64}
                      alt="Original WePlay Screenshot"
                      className="max-h-[480px] w-auto max-w-full object-contain rounded-lg shadow-lg"
                      referrerPolicy="no-referrer"
                    />
                  ) : editedDataUrl ? (
                    <img
                      src={editedDataUrl}
                      alt="Edited WePlay Screenshot"
                      className="max-h-[480px] w-auto max-w-full object-contain rounded-lg shadow-lg transition-all"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-slate-500 text-xs">Memproses tampilan canvas...</div>
                  )}

                  {/* Bounding box position indicator hint */}
                  <div className="absolute bottom-2.5 right-2.5 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] text-slate-400 border border-slate-700/60 pointer-events-none">
                    Kata: <strong className="text-sky-300">{replacementWord}</strong>
                  </div>
                </div>

                {/* AI Detection Summary Banner */}
                {analysisResult && (
                  <div className="p-2.5 bg-sky-500/10 border border-sky-500/25 rounded-xl flex items-start gap-2.5 text-xs text-slate-300">
                    <Sparkles className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 font-semibold text-sky-200">
                        <span>Kata Asli Terdeteksi:</span>
                        <span className="font-mono bg-sky-500/20 px-1.5 py-0.2 rounded text-sky-300">
                          {analysisResult.detectedWord || 'TIDAK TERDETEKSI'}
                        </span>
                        {analysisResult.roleType && (
                          <span className="text-[10px] text-slate-400 capitalize">
                            ({analysisResult.roleType})
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {analysisResult.explanation ||
                          'AI telah menyelaraskan warna latar kartu, font, dan letak kata rahasia.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => runAiAnalysis(sourceBase64, mimeType, sourceImageElement!)}
                      disabled={isAnalyzing}
                      className="p-1 text-slate-400 hover:text-sky-300 rounded cursor-pointer shrink-0"
                      title="Analisis Ulang dengan AI"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Controls, Word Selector & Fine Tuning (5 cols) */}
              <div className="lg:col-span-5 flex flex-col space-y-4">
                {/* 1. Target Word Input & Quick Selector */}
                <div className="bg-[#112240] border border-[#233554] rounded-xl p-3.5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#F8FAFC] tracking-tight flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-[#00D2FF]" />
                      <span>Kata Baru (Pengganti)</span>
                    </label>
                    <span className="text-[10px] text-[#94A3B8]">Pilih atau ketik</span>
                  </div>

                  {/* Input field */}
                  <div className="relative">
                    <input
                      type="text"
                      value={replacementWord}
                      onChange={(e) => setReplacementWord(e.target.value)}
                      placeholder="Masukkan kata baru (cth: KOPI)..."
                      className="w-full px-3.5 py-2.5 bg-[#080F1E] border border-[#233554] rounded-lg text-sm font-bold text-[#00D2FF] placeholder-[#64748B] focus:outline-none focus:border-[#00D2FF] focus:ring-1 focus:ring-[#00D2FF] uppercase transition-all"
                    />
                  </div>

                  {/* One-Click Swap with Opposing Pair if available */}
                  {linkedPairWords.length > 0 && (
                    <div className="p-2.5 bg-[#080F1E] rounded-lg border border-[#233554] space-y-1.5">
                      <div className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-1">
                        <ArrowRightLeft className="w-3 h-3 text-emerald-400" />
                        <span>Pasangan Terkait di Kamus</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {linkedPairWords.map((pw) => (
                          <button
                            key={pw}
                            type="button"
                            onClick={() => setReplacementWord(pw)}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-colors cursor-pointer"
                          >
                            Ganti ke: {pw}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dictionary Quick Picker Trigger */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setIsWordDropdownOpen(!isWordDropdownOpen)}
                      className="w-full flex items-center justify-between px-3 py-2 bg-[#080F1E] hover:bg-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] text-xs rounded-lg border border-[#233554] transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Search className="w-3 h-3 text-[#94A3B8]" />
                        <span>Pilih dari Kamus Kata ({words.length})</span>
                      </span>
                      <span className="text-[10px] text-[#00D2FF] font-semibold">
                        {isWordDropdownOpen ? 'Tutup' : 'Buka List'}
                      </span>
                    </button>

                    {/* Expandable Dictionary Dropdown */}
                    {isWordDropdownOpen && (
                      <div className="mt-2 p-2 bg-[#080F1E] border border-[#233554] rounded-lg space-y-2 max-h-48 overflow-y-auto">
                        <input
                          type="text"
                          value={wordSearchFilter}
                          onChange={(e) => setWordSearchFilter(e.target.value)}
                          placeholder="Cari kata di kamus..."
                          className="w-full px-2.5 py-1.5 bg-[#0A192F] border border-[#233554] rounded-lg text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#00D2FF]"
                        />
                        <div className="flex flex-wrap gap-1">
                          {filteredWords.map((w) => (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => {
                                setReplacementWord(w.term);
                                setIsWordDropdownOpen(false);
                              }}
                              className="px-2 py-1 rounded-md text-[11px] bg-[#112240] hover:bg-[#00D2FF]/20 hover:text-[#00D2FF] text-[#94A3B8] border border-[#233554] transition-colors cursor-pointer"
                            >
                              {w.term}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Anti-Censor Homoglyph Toggle */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#233554]">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-[#94A3B8]">
                      <VenetianMask className="w-3.5 h-3.5 text-amber-400" />
                      <span>Homoglif Anti-Sensor</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={editorOptions.useHomoglyph}
                      onChange={(e) =>
                        setEditorOptions((prev) => ({ ...prev, useHomoglyph: e.target.checked }))
                      }
                      className="rounded border-[#233554] text-[#00D2FF] focus:ring-0 cursor-pointer accent-[#00D2FF]"
                    />
                  </div>
                </div>

                {/* 2. Visual Style & Fine-Tuning Controls */}
                <div className="bg-[#112240] border border-[#233554] rounded-xl p-3.5 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F8FAFC] tracking-tight flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#00D2FF]" />
                      <span>Penyesuaian Visual Font & Kartu</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                      className="text-[10px] text-[#00D2FF] hover:underline cursor-pointer font-semibold"
                    >
                      {showAdvancedSettings ? 'Sederhana' : 'Lebih Lengkap'}
                    </button>
                  </div>

                  {/* Font Size Scale Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-[#94A3B8]">
                      <span>Ukuran Huruf (Font Scale)</span>
                      <span className="font-mono text-[#F8FAFC]">
                        {Math.round(editorOptions.fontSizeScale * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.6"
                      step="0.05"
                      value={editorOptions.fontSizeScale}
                      onChange={(e) =>
                        setEditorOptions((prev) => ({
                          ...prev,
                          fontSizeScale: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full h-1.5 bg-[#080F1E] rounded-lg appearance-none cursor-pointer accent-[#00D2FF]"
                    />
                  </div>

                  {/* Text Color Presets */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-[#94A3B8]">
                      <span>Warna Teks</span>
                      <span className="font-mono text-[10px] text-[#94A3B8]">
                        {editorOptions.textColor}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {[
                        { label: 'WePlay Cokelat', color: '#2C1805' },
                        { label: 'Putih', color: '#FFFFFF' },
                        { label: 'Kuning Gelap', color: '#854D0E' },
                        { label: 'Hitam', color: '#111827' },
                        { label: 'Biru WePlay', color: '#1E3A8A' },
                      ].map((c) => (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() =>
                            setEditorOptions((prev) => ({ ...prev, textColor: c.color }))
                          }
                          style={{ backgroundColor: c.color }}
                          className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                            editorOptions.textColor.toLowerCase() === c.color.toLowerCase()
                              ? 'scale-115 border-[#00D2FF] ring-2 ring-[#00D2FF]/40'
                              : 'border-[#233554] hover:scale-105'
                          }`}
                          title={c.label}
                        />
                      ))}
                      <input
                        type="color"
                        value={editorOptions.textColor}
                        onChange={(e) =>
                          setEditorOptions((prev) => ({ ...prev, textColor: e.target.value }))
                        }
                        className="w-7 h-7 p-0 bg-transparent border-0 rounded cursor-pointer ml-auto"
                        title="Pilih warna custom"
                      />
                    </div>
                  </div>

                  {/* Advanced Controls (Position offsets & blending) */}
                  {showAdvancedSettings && (
                    <div className="pt-2 border-t border-[#233554] space-y-3 animate-in fade-in duration-150">
                      {/* Vertical & Horizontal Offset */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="flex justify-between text-[10px] text-[#94A3B8] mb-1">
                            <span>Geser X</span>
                            <span className="font-mono text-[#F8FAFC]">{editorOptions.xOffset}px</span>
                          </div>
                          <input
                            type="range"
                            min="-50"
                            max="50"
                            value={editorOptions.xOffset}
                            onChange={(e) =>
                              setEditorOptions((prev) => ({
                                ...prev,
                                xOffset: parseInt(e.target.value, 10),
                              }))
                            }
                            className="w-full h-1 bg-[#080F1E] rounded appearance-none accent-[#00D2FF]"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-[#94A3B8] mb-1">
                            <span>Geser Y</span>
                            <span className="font-mono text-[#F8FAFC]">{editorOptions.yOffset}px</span>
                          </div>
                          <input
                            type="range"
                            min="-50"
                            max="50"
                            value={editorOptions.yOffset}
                            onChange={(e) =>
                              setEditorOptions((prev) => ({
                                ...prev,
                                yOffset: parseInt(e.target.value, 10),
                              }))
                            }
                            className="w-full h-1 bg-[#080F1E] rounded appearance-none accent-[#00D2FF]"
                          />
                        </div>
                      </div>

                      {/* Card Blend Mode */}
                      <div>
                        <div className="text-[10px] text-[#94A3B8] mb-1.5">Penyamaran Kartu Latar</div>
                        <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                          {[
                            { id: 'auto_sample', label: 'Auto Sample' },
                            { id: 'solid_color', label: 'Warna Kartu' },
                            { id: 'linear_gradient', label: 'Gradasi' },
                          ].map((b) => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() =>
                                setEditorOptions((prev) => ({
                                  ...prev,
                                  blendMode: b.id as any,
                                }))
                              }
                              className={`py-1 px-1.5 rounded-lg text-center border font-medium transition-colors cursor-pointer ${
                                editorOptions.blendMode === b.id
                                  ? 'bg-[#00D2FF]/20 text-[#00D2FF] border-[#00D2FF]/40'
                                  : 'bg-[#080F1E] text-[#94A3B8] border-[#233554] hover:text-[#F8FAFC]'
                              }`}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Text Transform Casing */}
                      <div>
                        <div className="text-[10px] text-[#94A3B8] mb-1.5">Format Huruf</div>
                        <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                          {[
                            { id: 'uppercase', label: 'HURUF BESAR' },
                            { id: 'capitalize', label: 'Huruf Awal' },
                            { id: 'none', label: 'Sesuai Ketikan' },
                          ].map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() =>
                                setEditorOptions((prev) => ({
                                  ...prev,
                                  textTransform: t.id as any,
                                }))
                              }
                              className={`py-1 px-1.5 rounded-lg text-center border font-medium transition-colors cursor-pointer ${
                                editorOptions.textTransform === t.id
                                  ? 'bg-[#00D2FF]/20 text-[#00D2FF] border-[#00D2FF]/40'
                                  : 'bg-[#080F1E] text-[#94A3B8] border-[#233554] hover:text-[#F8FAFC]'
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Stroke & Shadow Toggles */}
                      <div className="flex items-center justify-between text-[11px] text-[#94A3B8] pt-1">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editorOptions.hasShadow}
                            onChange={(e) =>
                              setEditorOptions((prev) => ({
                                ...prev,
                                hasShadow: e.target.checked,
                              }))
                            }
                            className="rounded border-[#233554] bg-[#080F1E] text-[#00D2FF] focus:ring-0"
                          />
                          <span className="text-[#F8FAFC]">Bayangan Teks (Shadow)</span>
                        </label>

                        <button
                          type="button"
                          onClick={() =>
                            setEditorOptions((prev) => ({
                              ...prev,
                              fontSizeScale: 1.0,
                              xOffset: 0,
                              yOffset: 0,
                            }))
                          }
                          className="flex items-center gap-1 text-[10px] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reset Posisi</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Export & Action Buttons */}
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleCopyClipboard}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#112240] hover:bg-[#1E293B] text-[#F8FAFC] font-semibold text-xs rounded-lg border border-[#233554] transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.98]"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-300">Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-[#00D2FF]" />
                          <span>Salin Gambar</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownload}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#00D2FF] hover:bg-[#38BDF8] active:scale-[0.98] text-[#0A192F] font-semibold text-xs rounded-lg transition-all duration-200 cursor-pointer shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh Foto (PNG)</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-center text-[#94A3B8]">
                    Foto hasil editan beresolusi tinggi, siap dibagikan ke anggota party atau grup WePlay.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
