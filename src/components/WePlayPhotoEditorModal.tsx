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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
    >
      <div
        className="bg-[#0F172A] border border-[#334155] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[#334155]/80 bg-[#1E293B]/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-100">
                  AI Screenshot WePlay Editor
                </h2>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Who's the Spy
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Ganti kata peran di screenshot game WePlay secara otomatis & autentik
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
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
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all ${
                isDraggingOver
                  ? 'border-sky-400 bg-sky-500/10'
                  : 'border-[#334155] bg-[#1E293B]/40 hover:border-slate-500'
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
                <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                  <ImageIcon className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-200">
                    Upload Screenshot WePlay Who's the Spy
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Tarik dan lepas screenshot kartu kata / room WePlay di sini, atau paste langsung dari clipboard (<code className="bg-slate-800 px-1 py-0.5 rounded text-sky-300">Ctrl + V</code>).
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-xl transition-colors cursor-pointer shadow-md"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Pilih Foto Screenshot</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLoadSample}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Gunakan Contoh WePlay</span>
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 pt-2 flex items-center justify-center gap-1.5">
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
                <div className="flex items-center justify-between text-xs text-slate-400 bg-[#1E293B] px-3 py-2 rounded-xl border border-[#334155]/70">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200 truncate max-w-[160px]">
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
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        showOriginal
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'text-slate-300 hover:bg-slate-800'
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
                      className="text-slate-400 hover:text-slate-200 text-[11px] hover:underline cursor-pointer"
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
                <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Type className="w-3.5 h-3.5 text-sky-400" />
                      <span>Kata Baru (Pengganti)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Pilih atau ketik</span>
                  </div>

                  {/* Input field */}
                  <div className="relative">
                    <input
                      type="text"
                      value={replacementWord}
                      onChange={(e) => setReplacementWord(e.target.value)}
                      placeholder="Masukkan kata baru (cth: KOPI)..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm font-bold text-sky-300 placeholder:text-slate-500 focus:outline-hidden focus:border-sky-500 focus:ring-1 focus:ring-sky-500 uppercase"
                    />
                  </div>

                  {/* One-Click Swap with Opposing Pair if available */}
                  {linkedPairWords.length > 0 && (
                    <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800 space-y-1.5">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <ArrowRightLeft className="w-3 h-3 text-emerald-400" />
                        <span>Pasangan Terkait di Kamus</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {linkedPairWords.map((pw) => (
                          <button
                            key={pw}
                            type="button"
                            onClick={() => setReplacementWord(pw)}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
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
                      className="w-full flex items-center justify-between px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700/80 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Search className="w-3 h-3 text-slate-400" />
                        <span>Pilih dari Kamus Kata ({words.length})</span>
                      </span>
                      <span className="text-[10px] text-sky-400">
                        {isWordDropdownOpen ? 'Tutup' : 'Buka List'}
                      </span>
                    </button>

                    {/* Expandable Dictionary Dropdown */}
                    {isWordDropdownOpen && (
                      <div className="mt-2 p-2 bg-slate-900 border border-slate-700 rounded-lg space-y-2 max-h-48 overflow-y-auto">
                        <input
                          type="text"
                          value={wordSearchFilter}
                          onChange={(e) => setWordSearchFilter(e.target.value)}
                          placeholder="Cari kata di kamus..."
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-slate-200"
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
                              className="px-2 py-0.5 rounded text-[11px] bg-slate-800 hover:bg-sky-500/20 hover:text-sky-300 text-slate-300 border border-slate-700/70 transition-colors cursor-pointer"
                            >
                              {w.term}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Anti-Censor Homoglyph Toggle */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <VenetianMask className="w-3.5 h-3.5 text-amber-400" />
                      <span>Homoglif Anti-Sensor</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={editorOptions.useHomoglyph}
                      onChange={(e) =>
                        setEditorOptions((prev) => ({ ...prev, useHomoglyph: e.target.checked }))
                      }
                      className="rounded border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* 2. Visual Style & Fine-Tuning Controls */}
                <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-sky-400" />
                      <span>Penyesuaian Visual Font & Kartu</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                      className="text-[10px] text-sky-400 hover:underline cursor-pointer"
                    >
                      {showAdvancedSettings ? 'Sederhana' : 'Lebih Lengkap'}
                    </button>
                  </div>

                  {/* Font Size Scale Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Ukuran Huruf (Font Scale)</span>
                      <span className="font-mono text-slate-200">
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
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                    />
                  </div>

                  {/* Text Color Presets */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Warna Teks</span>
                      <span className="font-mono text-[10px] text-slate-300">
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
                              ? 'scale-115 border-sky-400 ring-2 ring-sky-400/40'
                              : 'border-slate-600 hover:scale-105'
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
                    <div className="pt-2 border-t border-slate-800 space-y-3 animate-in fade-in duration-150">
                      {/* Vertical & Horizontal Offset */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                            <span>Geser X</span>
                            <span className="font-mono">{editorOptions.xOffset}px</span>
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
                            className="w-full h-1 bg-slate-800 rounded appearance-none accent-sky-400"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                            <span>Geser Y</span>
                            <span className="font-mono">{editorOptions.yOffset}px</span>
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
                            className="w-full h-1 bg-slate-800 rounded appearance-none accent-sky-400"
                          />
                        </div>
                      </div>

                      {/* Card Blend Mode */}
                      <div>
                        <div className="text-[10px] text-slate-400 mb-1.5">Penyamaran Kartu Latar</div>
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
                              className={`py-1 px-1.5 rounded text-center border font-medium transition-colors cursor-pointer ${
                                editorOptions.blendMode === b.id
                                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
                              }`}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Text Transform Casing */}
                      <div>
                        <div className="text-[10px] text-slate-400 mb-1.5">Format Huruf</div>
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
                              className={`py-1 px-1.5 rounded text-center border font-medium transition-colors cursor-pointer ${
                                editorOptions.textTransform === t.id
                                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
                              }`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Stroke & Shadow Toggles */}
                      <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1">
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
                            className="rounded border-slate-700 text-sky-500 focus:ring-0"
                          />
                          <span>Bayangan Teks (Shadow)</span>
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
                          className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200"
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
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#1E293B] hover:bg-slate-700 text-slate-100 font-semibold text-xs rounded-xl border border-[#334155] transition-colors cursor-pointer shadow-xs"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-300">Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-sky-400" />
                          <span>Salin Gambar</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownload}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer shadow-md"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh Foto (PNG)</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-center text-slate-400">
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
