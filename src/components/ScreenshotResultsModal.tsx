import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  UploadCloud,
  FileImage,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Sparkles,
  Loader2,
  Plus,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { Word, RelationTag, ExtractedGameResult, RELATION_TAGS, TAG_METADATA } from '../types';
import {
  prepareScreenshotForOcr,
  extractGameResultsFromScreenshot,
  checkPairDuplicate,
} from '../utils/screenshotResultsExtractor';

interface ScreenshotResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  words: Word[];
  onCommitPairs: (pairs: { termA: string; termB: string; tag: RelationTag }[]) => void;
  onToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const ScreenshotResultsModal: React.FC<ScreenshotResultsModalProps> = ({
  isOpen,
  onClose,
  words,
  onCommitPairs,
  onToast,
}) => {
  const [items, setItems] = useState<ExtractedGameResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(0);
  const [totalToProcess, setTotalToProcess] = useState(0);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle global paste event when modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;

      const files: File[] = [];
      for (let i = 0; i < clipboardItems.length; i++) {
        const item = clipboardItems[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        handleProcessFiles(files);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, words]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setItems([]);
      setIsProcessing(false);
      setZoomImageUrl(null);
    }
  }, [isOpen]);

  const handleProcessFiles = async (files: File[]) => {
    if (!files.length) return;

    const newItems: ExtractedGameResult[] = [];

    // Pre-create pending items with preview URLs
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const previewUrl = URL.createObjectURL(file);
      newItems.push({
        id: 'res_' + Math.random().toString(36).substring(2, 9),
        fileName: file.name || `Screenshot ${i + 1}`,
        imagePreviewUrl: previewUrl,
        civilianWord: '',
        spyWord: '',
        confidence: 0,
        status: 'pending',
        selectedTag: 'ss_verified',
      });
    }

    setItems((prev) => [...prev, ...newItems]);
    setIsProcessing(true);
    setTotalToProcess(files.length);

    // Sequential batch processing with state updates
    for (let i = 0; i < files.length; i++) {
      setCurrentProcessingIndex(i + 1);
      const file = files[i];
      const itemId = newItems[i].id;

      try {
        const { base64, mimeType } = await prepareScreenshotForOcr(file, 1280);
        const extraction = await extractGameResultsFromScreenshot(base64, mimeType);

        const civWord = extraction.civilianWord || '';
        const spyWord = extraction.spyWord || '';

        const dupCheck = checkPairDuplicate(words, civWord, spyWord);

        setItems((currentItems) =>
          currentItems.map((item) => {
            if (item.id === itemId) {
              return {
                ...item,
                civilianWord: civWord,
                spyWord: spyWord,
                confidence: extraction.confidence || 0.9,
                winner: extraction.winner,
                notes: extraction.notes,
                status: 'success',
                isDuplicate: dupCheck.isDuplicate,
                duplicateInfo: dupCheck.duplicateDetails,
              };
            }
            return item;
          })
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to analyze screenshot.';
        setItems((currentItems) =>
          currentItems.map((item) => {
            if (item.id === itemId) {
              return {
                ...item,
                status: 'error',
                errorMessage: msg,
              };
            }
            return item;
          })
        );
      }
    }

    setIsProcessing(false);
    onToast(`Processed ${files.length} screenshot(s). Review terms below before importing.`, 'info');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const imageFiles = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith('image/')
      );
      if (imageFiles.length > 0) {
        handleProcessFiles(imageFiles);
      }
    }
  };

  const handleWordChange = (id: string, field: 'civilianWord' | 'spyWord', value: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          const dup = checkPairDuplicate(words, updated.civilianWord, updated.spyWord);
          return {
            ...updated,
            isDuplicate: dup.isDuplicate,
            duplicateInfo: dup.duplicateDetails,
          };
        }
        return item;
      })
    );
  };

  const handleSwapWords = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const swapped = {
            ...item,
            civilianWord: item.spyWord,
            spyWord: item.civilianWord,
          };
          const dup = checkPairDuplicate(words, swapped.civilianWord, swapped.spyWord);
          return {
            ...swapped,
            isDuplicate: dup.isDuplicate,
            duplicateInfo: dup.duplicateDetails,
          };
        }
        return item;
      })
    );
  };

  const handleTagChange = (id: string, tag: RelationTag) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selectedTag: tag } : item))
    );
  };

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleCommitAll = () => {
    const validPairs = items
      .filter(
        (it) =>
          it.status === 'success' &&
          it.civilianWord.trim().length > 0 &&
          it.spyWord.trim().length > 0 &&
          !it.isDuplicate
      )
      .map((it) => ({
        termA: it.civilianWord.trim(),
        termB: it.spyWord.trim(),
        tag: it.selectedTag,
      }));

    if (validPairs.length === 0) {
      onToast('No new valid pairs to import.', 'error');
      return;
    }

    onCommitPairs(validPairs);
    onToast(`Successfully imported ${validPairs.length} pair(s) to dictionary!`, 'success');
    onClose();
  };

  if (!isOpen) return null;

  const validCount = items.filter(
    (it) =>
      it.status === 'success' &&
      it.civilianWord.trim() &&
      it.spyWord.trim() &&
      !it.isDuplicate
  ).length;

  const duplicateCount = items.filter((it) => it.isDuplicate).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#1E293B] border border-[#334155] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#334155] flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Scan Game Result Screenshots
                <span className="text-xs px-2 py-0.5 rounded font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  SS Verified
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Extract Civilian and Spy word pairs automatically from WePlay victory screens
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Dropzone Upload Box */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
              isProcessing
                ? 'border-cyan-500/50 bg-cyan-500/5 cursor-wait'
                : 'border-slate-600 hover:border-cyan-400/80 bg-slate-900/40 hover:bg-slate-900/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleFileInputChange}
              disabled={isProcessing}
            />

            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-full bg-slate-800/90 border border-slate-700 flex items-center justify-center text-cyan-400 shadow-sm">
                {isProcessing ? (
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-slate-200">
                  {isProcessing
                    ? `Analyzing screenshot ${currentProcessingIndex} of ${totalToProcess}...`
                    : 'Click or drag WePlay game-over screenshots here'}
                </p>
                <p className="text-xs text-slate-400">
                  Supports multiple images at once (PNG, JPG) or press{' '}
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300">
                    Ctrl + V
                  </kbd>{' '}
                  to paste from clipboard
                </p>
              </div>
            </div>
          </div>

          {/* Processing Progress Bar */}
          {isProcessing && (
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl space-y-2">
              <div className="flex justify-between text-xs text-cyan-300 font-medium">
                <span>Gemini Vision OCR analyzing game screens...</span>
                <span className="tabular-nums">
                  {currentProcessingIndex} / {totalToProcess}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-300"
                  style={{ width: `${(currentProcessingIndex / Math.max(1, totalToProcess)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Review Staging Queue */}
          {items.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                <span className="font-semibold text-slate-300">
                  Staged Results ({items.length} screenshots)
                </span>
                <div className="flex items-center gap-3">
                  {duplicateCount > 0 && (
                    <span className="text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {duplicateCount} duplicate(s)
                    </span>
                  )}
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {validCount} ready to save
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {items.map((item, idx) => {
                  const meta = TAG_METADATA[item.selectedTag] || TAG_METADATA.ss_verified;

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 sm:p-4 rounded-xl border transition-colors ${
                        item.status === 'error'
                          ? 'bg-rose-500/5 border-rose-500/30'
                          : item.isDuplicate
                          ? 'bg-amber-500/5 border-amber-500/30'
                          : 'bg-slate-900/60 border-slate-700/80 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        {/* Thumbnail & File Name */}
                        <div className="flex items-center gap-3 shrink-0">
                          <div
                            onClick={() => setZoomImageUrl(item.imagePreviewUrl)}
                            className="relative w-14 h-14 rounded-lg bg-slate-800 border border-slate-700 overflow-hidden cursor-zoom-in group shrink-0"
                            title="Click to zoom image"
                          >
                            <img
                              src={item.imagePreviewUrl}
                              alt={item.fileName}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-4 h-4 text-white" />
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-200 truncate max-w-[140px] sm:max-w-[180px]">
                              {item.fileName}
                            </p>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              {item.status === 'pending' && (
                                <span className="text-slate-400 flex items-center gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" /> In queue
                                </span>
                              )}
                              {item.status === 'error' && (
                                <span className="text-rose-400 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" /> Error analyzing
                                </span>
                              )}
                              {item.status === 'success' && (
                                <>
                                  <span className="text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Detected
                                  </span>
                                  {item.winner && (
                                    <span>· Winner: {item.winner}</span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Words Inputs & Role Swap */}
                        {item.status === 'success' && (
                          <div className="flex-1 w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
                            {/* Civilian Word */}
                            <div className="w-full sm:flex-1">
                              <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">
                                Civilian (Warga)
                              </label>
                              <input
                                type="text"
                                value={item.civilianWord}
                                onChange={(e) =>
                                  handleWordChange(item.id, 'civilianWord', e.target.value)
                                }
                                placeholder="Civilian word"
                                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 focus:border-cyan-400 rounded-lg text-xs font-semibold text-slate-100 outline-none"
                              />
                            </div>

                            {/* Swap Button */}
                            <button
                              type="button"
                              onClick={() => handleSwapWords(item.id)}
                              className="p-1.5 mt-4 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-md transition-colors cursor-pointer shrink-0"
                              title="Swap Civilian and Spy roles"
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>

                            {/* Spy Word */}
                            <div className="w-full sm:flex-1">
                              <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">
                                Spy (Undercover)
                              </label>
                              <input
                                type="text"
                                value={item.spyWord}
                                onChange={(e) =>
                                  handleWordChange(item.id, 'spyWord', e.target.value)
                                }
                                placeholder="Spy word"
                                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 focus:border-cyan-400 rounded-lg text-xs font-semibold text-slate-100 outline-none"
                              />
                            </div>

                            {/* Tag Selector */}
                            <div className="w-full sm:w-auto shrink-0">
                              <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-semibold">
                                Tag Category
                              </label>
                              <select
                                value={item.selectedTag}
                                onChange={(e) =>
                                  handleTagChange(item.id, e.target.value as RelationTag)
                                }
                                className={`px-2 py-1.5 rounded-lg text-xs font-medium border bg-slate-800 text-slate-200 outline-none cursor-pointer ${meta.badgeBorder}`}
                              >
                                {RELATION_TAGS.map((t) => (
                                  <option key={t} value={t} className="bg-slate-900 text-slate-200">
                                    {TAG_METADATA[t].label} ({TAG_METADATA[t].shortCode})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}

                        {/* Error info display */}
                        {item.status === 'error' && (
                          <div className="flex-1 text-xs text-rose-400">
                            {item.errorMessage || 'Could not detect game words from this screenshot.'}
                          </div>
                        )}

                        {/* Delete item button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer self-end sm:self-center shrink-0"
                          title="Remove screenshot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Duplicate warning bar */}
                      {item.isDuplicate && (
                        <div className="mt-2.5 pt-2 border-t border-amber-500/20 text-xs text-amber-300 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                            {item.duplicateInfo || 'This pair already exists in your dictionary.'}
                          </span>
                          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono">
                            Will Skip
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-[#334155] bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {items.length > 0 ? (
              <span>
                Ready to commit: <strong className="text-cyan-300">{validCount}</strong> new pair(s)
                under tag <strong className="text-cyan-400">SS Verified</strong>.
              </span>
            ) : (
              <span>No screenshots loaded yet. Upload images above to begin.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {items.length > 0 && (
              <button
                type="button"
                onClick={() => setItems([])}
                className="px-3.5 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Clear All
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={validCount === 0 || isProcessing}
              onClick={handleCommitAll}
              className="px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Import Verified Pairs ({validCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Screenshot Zoom Modal */}
      {zoomImageUrl && (
        <div
          onClick={() => setZoomImageUrl(null)}
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-2xl max-h-[90vh]">
            <img
              src={zoomImageUrl}
              alt="Zoomed screenshot"
              className="max-h-[85vh] w-auto rounded-xl shadow-2xl object-contain border border-slate-700"
            />
            <button
              onClick={() => setZoomImageUrl(null)}
              className="absolute top-3 right-3 p-2 bg-slate-900/80 text-white rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
