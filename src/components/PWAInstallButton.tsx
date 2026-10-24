import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-[#00D2FF] px-3 py-1.5 text-xs font-semibold text-[#0A192F] shadow-sm hover:bg-[#38BDF8] active:scale-[0.98] transition-all"
      >
        <Download className="w-3.5 h-3.5" />
        Install App
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#112240] border border-[#233554] px-3 py-1.5 text-xs font-semibold text-[#F8FAFC] shadow-sm hover:bg-[#1E293B] transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-[#00D2FF]" />
          Install App
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-xl bg-[#112240] p-6 shadow-sm border border-[#233554] space-y-4">
              <h3 className="text-base font-bold text-[#F8FAFC] tracking-tight">Install on iPhone / iPad</h3>
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                1. Tap the <strong className="text-[#F8FAFC]">Share</strong> button in Safari toolbar.<br />
                2. Scroll down and tap <strong className="text-[#00D2FF]">Add to Home Screen</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-lg bg-[#1E293B] hover:bg-[#233554] py-2 text-xs font-semibold text-[#F8FAFC] border border-[#233554] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
