import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, X } from 'lucide-react';

interface InstallPromptModalProps {
  onClose: () => void;
}

export const InstallPromptModal: React.FC<InstallPromptModalProps> = ({ onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Delay slightly to ensure prompts have fired
    const timer = setTimeout(() => {
      const hasDenied = localStorage.getItem('has_denied_install') === 'true';
      if (!isInstalled && !hasDenied && (isInstallable || isIOS)) {
        setIsOpen(true);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [isInstallable, isInstalled, isIOS]);

  const handleDeny = () => {
    localStorage.setItem('has_denied_install', 'true');
    setIsOpen(false);
    onClose();
  };

  if (!isOpen || isInstalled) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#1E293B] w-full max-w-sm rounded-2xl shadow-2xl border border-sky-500/30 overflow-hidden animate-in zoom-in-95 duration-200 p-6 flex flex-col items-center text-center">
        <button
          type="button"
          onClick={handleDeny}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-16 h-16 bg-sky-500/20 rounded-2xl flex items-center justify-center mb-4 border border-sky-500/40">
          <img src="/app-icon.jpg" alt="Icon" className="w-14 h-14 rounded-xl object-cover" />
        </div>
        
        <h2 className="text-lg font-bold text-slate-100 mb-2">Install the App</h2>
        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          For the best experience, install Who Is The Spy Manual directly to your device home screen.
        </p>

        {isInstallable ? (
          <button
            onClick={async () => {
              await install();
              setIsOpen(false);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 transition-colors"
          >
            <Download className="w-4 h-4" />
            Install Now
          </button>
        ) : isIOS ? (
          <button
            onClick={() => setShowIOSGuide(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 transition-colors"
          >
            <Download className="w-4 h-4" />
            Show Install Guide
          </button>
        ) : null}

        <button
          type="button"
          onClick={handleDeny}
          className="mt-3 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          Maybe Later
        </button>
      </div>

      {showIOSGuide && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl bg-[#1E293B] p-6 shadow-xl border border-slate-700">
            <h3 className="text-lg font-semibold text-slate-100">Install on iPhone / iPad</h3>
            <p className="mt-2 text-sm text-slate-300">
              1. Tap the <strong>Share</strong> button in Safari toolbar.<br />
              2. Scroll down and tap <strong>Add to Home Screen</strong>.
            </p>
            <button
              onClick={() => {
                setShowIOSGuide(false);
                handleDeny();
              }}
              className="mt-4 w-full rounded-lg bg-slate-800 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 border border-slate-600 transition-colors"
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
