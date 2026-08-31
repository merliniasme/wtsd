import React, { useState, useMemo, useRef } from 'react';
import { Word } from '../types';
import { validateRawImportText, applyRawImport, RawImportValidationResult } from '../utils/rawImport';
import {
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  FileUp,
  ArrowRight,
  Sparkles,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface RawImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingWords: Word[];
  onImportComplete: (newWords: Word[], msg: string) => void;
}

const SAMPLE_RAW_TEXT = `Apel # Banana & Tomato
Cat # Dog & Fox
Coffee # Tea & Milk & Cocoa
[Summer] # [Winter] & [Autumn]`;

export const RawImportModal: React.FC<RawImportModalProps> = ({
  isOpen,
  onClose,
  existingWords,
  onImportComplete,
}) => {
  const [rawInput, setRawInput] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [skipErrors, setSkipErrors] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute validation report in real-time
  const validationResult: RawImportValidationResult = useMemo(() => {
    return validateRawImportText(rawInput);
  }, [rawInput]);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (typeof text === 'string') {
        setRawInput(text);
        setActiveTab('paste'); // switch to review / paste view
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteImport = () => {
    const linesToImport = skipErrors
      ? validationResult.validLines
      : validationResult.isValid
      ? validationResult.validLines
      : [];

    if (linesToImport.length === 0) return;

    const result = applyRawImport(existingWords, linesToImport);
    onImportComplete(
      result.updatedWords,
      `Imported ${linesToImport.length} valid relation rule${linesToImport.length === 1 ? '' : 's'} (${result.addedPairsCount} pairs) with Unknown tag.`
    );
    handleResetAndClose();
  };

  const handleResetAndClose = () => {
    setRawInput('');
    setFileName(null);
    setIsDragging(false);
    setSkipErrors(false);
    onClose();
  };

  const canSubmit =
    (validationResult.isValid && validationResult.validLines.length > 0) ||
    (skipErrors && validationResult.validLines.length > 0);

  return (
    <div
      id="raw-import-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleResetAndClose();
      }}
    >
      <div
        id="raw-import-modal-card"
        className="bg-[#1E293B] w-full max-w-xl rounded-xl border border-[#334155] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 border-b border-[#334155] flex items-center justify-between bg-[#0F172A]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <FileUp className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <span>Raw Text Dictionary Import</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                  Tag: UNK (Unknown)
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Import formatted plain text files into bidirectional word pairs.
              </p>
            </div>
          </div>
          <button
            id="btn-close-raw-import"
            type="button"
            onClick={handleResetAndClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Help Box */}
        <div className="bg-[#0F172A]/70 px-4 py-2.5 border-b border-[#334155]/60 flex items-start gap-2.5 text-xs text-slate-300">
          <HelpCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-slate-200">
              Format Specification: <code className="text-sky-300 font-mono">[Word1] # [Word2] & [Word3]</code>
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Example: <code className="text-slate-300 font-mono">Apel # Banana & Tomato</code> links{' '}
              <span className="text-slate-200 font-semibold">Apel ↔ Banana</span> and{' '}
              <span className="text-slate-200 font-semibold">Apel ↔ Tomato</span> (does not link Banana to Tomato).
              All imported pairs will automatically be assigned the <span className="text-zinc-300 font-medium">Unknown (UNK)</span> tag.
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex border-b border-[#334155] bg-[#0F172A]/40 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2.5 px-4 font-medium flex items-center justify-center gap-2 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'upload'
                ? 'border-sky-400 text-sky-300 bg-[#1E293B]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload File</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`flex-1 py-2.5 px-4 font-medium flex items-center justify-center gap-2 border-b-2 cursor-pointer transition-colors ${
              activeTab === 'paste'
                ? 'border-sky-400 text-sky-300 bg-[#1E293B]'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Paste / Edit Raw Text</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'upload' ? (
            <div className="space-y-3">
              {/* Drag and Drop Zone */}
              <div
                id="dropzone-raw-import"
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 ${
                  isDragging
                    ? 'border-sky-400 bg-sky-500/10'
                    : 'border-[#334155] hover:border-slate-400 bg-[#0F172A]/50 hover:bg-[#0F172A]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv,.raw,.dat,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    Click to browse or drop your plain text file here
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Supports .txt, .raw, .csv, or any plain text file
                  </p>
                </div>
              </div>

              {/* Sample loader helper */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">Don't have a file ready?</span>
                <button
                  type="button"
                  id="btn-load-sample-raw"
                  onClick={() => {
                    setRawInput(SAMPLE_RAW_TEXT);
                    setActiveTab('paste');
                  }}
                  className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 cursor-pointer font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Load Sample Format</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300">
                  {fileName ? `File: ${fileName}` : 'Raw Dictionary Rules'}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRawInput(SAMPLE_RAW_TEXT)}
                    className="text-[11px] text-sky-400 hover:underline cursor-pointer"
                  >
                    Insert Sample
                  </button>
                  {rawInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setRawInput('');
                        setFileName(null);
                      }}
                      className="text-[11px] text-slate-400 hover:text-rose-300 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <textarea
                id="textarea-raw-import-input"
                rows={6}
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="Apel # Banana & Tomato&#10;Cat # Dog & Fox&#10;[Word1] # [Word2] & [Word3]"
                className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-xs font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-400"
              />
            </div>
          )}

          {/* Real-time Validation Report */}
          {rawInput.trim() && (
            <div className="space-y-3 pt-2">
              {/* Status Banner */}
              {validationResult.isValid ? (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-start gap-2.5 text-emerald-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-emerald-200">
                      File format is valid ({validationResult.validLines.length} rules, {validationResult.pairs.length} pairs)
                    </p>
                    <p className="text-[11px] text-emerald-400/80">
                      Found {validationResult.uniqueWords.length} unique words ready to be synchronized.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg space-y-2 text-rose-300 text-xs">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-rose-200">
                        Format errors detected in {validationResult.invalidLines.length} line(s)
                      </p>
                      <p className="text-[11px] text-rose-400/90">
                        {validationResult.validLines.length} valid rule(s) found.
                      </p>
                    </div>
                  </div>

                  {/* List of Line Errors */}
                  <div className="max-h-28 overflow-y-auto space-y-1 pl-6 pt-1">
                    {validationResult.invalidLines.slice(0, 5).map((err, idx) => (
                      <div key={idx} className="text-[11px] font-mono bg-slate-900/60 p-1.5 rounded border border-rose-900/50">
                        <span className="text-rose-400 font-bold">Line {err.lineNumber}:</span>{' '}
                        <span className="text-slate-300">{err.error}</span>
                      </div>
                    ))}
                    {validationResult.invalidLines.length > 5 && (
                      <p className="text-[10px] text-rose-400 italic">
                        + {validationResult.invalidLines.length - 5} more error lines...
                      </p>
                    )}
                  </div>

                  {/* Allow skipping invalid lines */}
                  {validationResult.validLines.length > 0 && (
                    <div className="pt-1 flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="checkbox-skip-raw-errors"
                        checked={skipErrors}
                        onChange={(e) => setSkipErrors(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0 cursor-pointer"
                      />
                      <label htmlFor="checkbox-skip-raw-errors" className="text-[11px] text-slate-300 cursor-pointer">
                        Skip invalid lines and import {validationResult.validLines.length} valid rules
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Parsed Pairs Preview */}
              {validationResult.pairs.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 font-medium text-slate-300">
                      <Layers className="w-3.5 h-3.5 text-sky-400" />
                      <span>Extracted Pairs Preview ({validationResult.pairs.length})</span>
                    </span>
                    <span className="text-zinc-400 font-mono text-[10px]">Tagged: UNK</span>
                  </div>

                  <div className="max-h-36 overflow-y-auto bg-[#0F172A] border border-[#334155] rounded-lg p-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {validationResult.pairs.slice(0, 12).map((pair, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-1.5 px-2 py-1 bg-slate-900/80 rounded border border-slate-800 text-[11px]"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-semibold text-slate-200 truncate">{pair.source}</span>
                          <ArrowRight className="w-3 h-3 text-sky-400 shrink-0" />
                          <span className="font-semibold text-slate-300 truncate">{pair.target}</span>
                        </div>
                        <span className="px-1.5 py-0.2 text-[9px] font-mono bg-zinc-800 text-zinc-300 rounded border border-zinc-700 shrink-0">
                          UNK
                        </span>
                      </div>
                    ))}
                    {validationResult.pairs.length > 12 && (
                      <div className="col-span-1 sm:col-span-2 text-center text-[10px] text-slate-500 py-1">
                        + {validationResult.pairs.length - 12} more pairs...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#334155] bg-[#0F172A] flex items-center justify-between gap-3">
          <button
            type="button"
            id="btn-cancel-raw-import"
            onClick={handleResetAndClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors cursor-pointer border border-[#334155]"
          >
            Cancel
          </button>

          <button
            type="button"
            id="btn-submit-raw-import"
            disabled={!canSubmit}
            onClick={handleExecuteImport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-400 hover:bg-sky-300 disabled:opacity-40 disabled:hover:bg-sky-400 text-slate-950 text-xs font-semibold rounded-lg transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>
              {canSubmit
                ? `Import ${
                    skipErrors ? validationResult.validLines.length : validationResult.validLines.length
                  } Rules (${validationResult.pairs.length} Pairs)`
                : 'Check Validity to Import'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
