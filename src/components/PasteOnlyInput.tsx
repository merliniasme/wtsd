import React, { useState } from 'react';
import { Clipboard, Check } from 'lucide-react';

interface PasteOnlyInputProps {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  disabled?: boolean;
}

export const PasteOnlyInput: React.FC<PasteOnlyInputProps> = ({
  id,
  value,
  onChange,
  placeholder = 'Paste word here (Paste only)...',
  autoFocus = false,
  className = '',
  disabled = false,
}) => {
  const [justPasted, setJustPasted] = useState(false);
  const [showPasteHint, setShowPasteHint] = useState(false);

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (text) {
      onChange(text.trim());
      setJustPasted(true);
      setShowPasteHint(false);
      setTimeout(() => setJustPasted(false), 1500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow navigation, deletion, enter, tab, and clipboard shortcut combinations
    const isControlKey =
      e.key === 'Backspace' ||
      e.key === 'Delete' ||
      e.key === 'Tab' ||
      e.key === 'Enter' ||
      e.key === 'Escape' ||
      e.key.startsWith('Arrow') ||
      e.ctrlKey ||
      e.metaKey;

    if (!isControlKey) {
      e.preventDefault();
      setShowPasteHint(true);
      setTimeout(() => setShowPasteHint(false), 2000);
    }
  };

  const handlePasteButtonClick = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          onChange(text.trim());
          setJustPasted(true);
          setShowPasteHint(false);
          setTimeout(() => setJustPasted(false), 1500);
          return;
        }
      }
    } catch {
      // If clipboard API permission is denied, trigger focus so user can Ctrl+V
    }
    setShowPasteHint(true);
    setTimeout(() => setShowPasteHint(false), 2000);
  };

  return (
    <div className="space-y-1">
      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          autoComplete="off"
          className={`w-full pl-3 pr-20 py-2 bg-[#080F1E] text-[#F8FAFC] placeholder-[#64748B] text-xs sm:text-sm rounded-lg border border-[#233554] focus:outline-none focus:border-[#00D2FF] focus:ring-1 focus:ring-[#00D2FF] transition-all ${className}`}
        />

        <button
          type="button"
          onClick={handlePasteButtonClick}
          className={`absolute right-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono transition-all flex items-center gap-1 cursor-pointer ${
            justPasted
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-[#112240] hover:bg-[#1E293B] text-[#00D2FF] border border-[#233554]'
          }`}
          title="Paste from clipboard"
        >
          {justPasted ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span>Pasted!</span>
            </>
          ) : (
            <>
              <Clipboard className="w-3 h-3 text-[#00D2FF]" />
              <span>Paste</span>
            </>
          )}
        </button>
      </div>

      <div className="flex items-center justify-between text-[10px] px-1 font-mono">
        <span className="text-[#94A3B8]">Input Mode: Paste only</span>
        {showPasteHint && (
          <span className="text-amber-400 font-semibold animate-pulse">
            Manual typing disabled. Use Paste button or Ctrl+V / ⌘+V
          </span>
        )}
      </div>
    </div>
  );
};
