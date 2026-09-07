import React, { useState } from 'react';
import { ShieldAlert, Copy, Check, X, Info } from 'lucide-react';
import { escapeCensoredWord, copyToClipboard } from '../utils/homoglyph';

interface AntiCensorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export const AntiCensorModal: React.FC<AntiCensorModalProps> = ({
  isOpen,
  onClose,
  onNotify,
}) => {
  const [inputText, setInputText] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const transformedText = escapeCensoredWord(inputText);

  const handleCopy = async () => {
    if (!transformedText) return;
    const success = await copyToClipboard(transformedText);
    if (success) {
      setIsCopied(true);
      onNotify('Copied Anti-Censor text!', 'success');
      setTimeout(() => setIsCopied(false), 2000);
    } else {
      onNotify('Failed to copy text', 'error');
    }
  };

  return (
    <div
      id="anti-censor-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="anti-censor-modal-card"
        className="bg-[#1E293B] w-full max-w-md rounded-2xl shadow-2xl border border-amber-500/30 overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-700/60 flex items-center justify-between bg-amber-500/5">
          <div className="flex items-center gap-2.5 text-amber-400">
            <ShieldAlert className="w-5 h-5" />
            <h2 className="font-semibold text-slate-100">Anti-Censor Tool</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start gap-2 text-xs text-amber-200/70 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Paste any text here to automatically insert invisible characters (Zero-Width Spaces). This prevents automated systems from detecting the words, while appearing normal to human readers.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Input Text</label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste word or text here..."
              className="w-full bg-[#0F172A] border border-[#334155] focus:border-amber-500 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y min-h-[100px] transition-colors"
            />
          </div>

          <div className="pt-4 border-t border-slate-700/60 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-400 truncate">
              {transformedText ? 'Ready to copy' : 'Waiting for input'}
            </div>
            
            <button
              type="button"
              onClick={handleCopy}
              disabled={!transformedText}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 text-slate-950 text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed shadow-sm shrink-0"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Anti-Censor</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
