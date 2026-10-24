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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A192F]/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#112240] w-full max-w-sm rounded-xl shadow-sm border border-[#233554] p-6 flex flex-col items-center text-center relative">
        <button
          type="button"
          onClick={handleDeny}
          className="absolute top-4 right-4 p-1.5 text-[#94A3B8] hover:text-white hover:bg-[#1E293B] rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 bg-[#0A192F] rounded-xl flex items-center justify-center mb-3 border border-[#233554]">
          <img src="/app-icon.jpg" alt="Spydex Icon" className="w-12 h-12 rounded-lg object-cover" />
        </div>
        
        <h2 className="text-lg font-bold text-[#F8FAFC] tracking-tight mb-0.5">Install Spydex</h2>
        <p className="text-xs font-semibold text-[#00D2FF] mb-2">The Ultimate Spy Toolkit</p>
        <p className="text-sm text-[#94A3B8] mb-6 leading-relaxed">
          For the best experience, install Spydex directly to your device home screen for fast offline-first access.
        </p>

        {isInstallable ? (
          <button
            onClick={async () => {
              await install();
              setIsOpen(false);
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 bg-[#00D2FF] text-[#0A192F] font-semibold px-4 py-2.5 rounded-lg hover:bg-[#38BDF8] transition-all duration-200 active:scale-[0.98] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Install Now
          </button>
        ) : isIOS ? (
          <button
            onClick={() => setShowIOSGuide(true)}
            className="w-full flex items-center justify-center gap-2 bg-[#00D2FF] text-[#0A192F] font-semibold px-4 py-2.5 rounded-lg hover:bg-[#38BDF8] transition-all duration-200 active:scale-[0.98] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Show Install Guide
          </button>
        ) : null}

        <button
          type="button"
          onClick={handleDeny}
          className="mt-3 text-xs font-medium text-[#94A3B8] hover:text-white transition-colors cursor-pointer"
        >
          Maybe Later
        </button>
      </div>

      {showIOSGuide && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0A192F]/80 p-4">
          <div className="w-full max-w-sm rounded-xl bg-[#112240] p-6 shadow-sm border border-[#233554]">
            <h3 className="text-lg font-semibold text-[#F8FAFC] tracking-tight">Install on iPhone / iPad</h3>
            <p className="mt-2 text-sm text-[#94A3B8] leading-relaxed">
              1. Tap the <strong className="text-[#F8FAFC]">Share</strong> button in Safari toolbar.<br />
              2. Scroll down and tap <strong className="text-[#F8FAFC]">Add to Home Screen</strong>.
            </p>
            <button
              onClick={() => {
                setShowIOSGuide(false);
                handleDeny();
              }}
              className="mt-4 w-full rounded-lg bg-[#1E293B] hover:bg-[#233554] border border-[#233554] py-2.5 text-sm font-medium text-[#F8FAFC] transition-colors cursor-pointer"
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
