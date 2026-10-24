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
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="anti-censor-modal-card"
        className="bg-[#112240] w-full max-w-md rounded-xl shadow-sm border border-[#233554] overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#233554] flex items-center justify-between bg-[#0A192F]">
          <div className="flex items-center gap-2.5 text-amber-400">
            <ShieldAlert className="w-5 h-5" />
            <h2 className="font-bold text-[#F8FAFC] tracking-tight">Anti-Censor Tool</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#94A3B8] hover:text-white hover:bg-[#1E293B] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Paste any text here to automatically insert invisible characters (Zero-Width Spaces). This prevents automated systems from detecting the words, while appearing normal to human readers.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#94A3B8]">Input Text</label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste word or text here..."
              className="w-full bg-[#080F1E] border border-[#233554] text-[#F8FAFC] placeholder-[#64748B] rounded-lg p-3 text-sm font-mono focus:outline-none focus:border-[#00D2FF] focus:ring-1 focus:ring-[#00D2FF] resize-y min-h-[100px] transition-all"
            />
          </div>

          <div className="pt-4 border-t border-[#233554] flex items-center justify-between gap-3">
            <div className="text-xs text-[#94A3B8] truncate">
              {transformedText ? 'Ready to copy' : 'Waiting for input'}
            </div>
            
            <button
              type="button"
              onClick={handleCopy}
              disabled={!transformedText}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#00D2FF] text-[#0A192F] font-semibold text-xs rounded-lg hover:bg-[#38BDF8] disabled:opacity-40 disabled:hover:bg-[#00D2FF] transition-all cursor-pointer disabled:cursor-not-allowed active:scale-[0.98] shadow-sm shrink-0"
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
