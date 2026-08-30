import React from 'react';
import { ShieldCheck, Cloud, Clock, Search, AlertCircle, Loader2 } from 'lucide-react';

interface LandingViewProps {
  onSignIn: () => void;
  isSigningIn: boolean;
  isAuthLoading: boolean;
  isTokenExpired: boolean;
  lastError: string | null;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onSignIn,
  isSigningIn,
  isAuthLoading,
  isTokenExpired,
  lastError,
}) => {
  return (
    <div
      id="landing-view-container"
      className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col justify-between font-sans selection:bg-sky-500/30 selection:text-sky-200"
    >
      {/* Top Bar */}
      <header className="border-b border-[#334155]/60 bg-[#0F172A]/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🕵️</span>
            <span className="font-semibold text-slate-100 text-sm tracking-tight">
              Spy Dictionary
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-medium bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Cloud className="w-3 h-3" />
              <span>Google Drive Auto-Sync</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Hero & Sign In Card */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="max-w-md w-full mx-auto space-y-6">
          {/* Main Card */}
          <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 sm:p-8 shadow-xl space-y-6">
            {/* Header / Brand Icon */}
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400 mx-auto flex items-center justify-center text-2xl shadow-inner">
                🕵️
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
                  Who's the Spy? Dictionary
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Private undercover word pairs with automatic cloud sync.
                </p>
              </div>
            </div>

            {/* Error or Token Expiration Warning */}
            {(isTokenExpired || lastError) && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium">
                    {isTokenExpired ? 'Google Session Reconnect Required' : 'Authentication Notice'}
                  </p>
                  <p className="text-amber-300/80 text-[11px]">
                    {lastError || 'Your session expired. Please sign in with Google to continue sync.'}
                  </p>
                </div>
              </div>
            )}

            {/* Action Area: Sign In Button */}
            <div className="space-y-3 pt-1">
              {isAuthLoading ? (
                <div className="flex items-center justify-center gap-2.5 py-3 text-slate-400 text-xs font-mono bg-slate-800/80 border border-[#334155] rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                  <span>Checking saved session...</span>
                </div>
              ) : (
                <button
                  id="btn-landing-google-signin"
                  onClick={onSignIn}
                  disabled={isSigningIn}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 font-semibold text-xs sm:text-sm rounded-lg transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSigningIn ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                      <span>Connecting to Google Drive...</span>
                    </>
                  ) : (
                    <>
                      {/* Official Google 'G' Logo */}
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                        />
                      </svg>
                      <span>Sign in with Google to Continue</span>
                    </>
                  )}
                </button>
              )}

              <p className="text-[11px] text-center text-slate-400">
                Sign in is required to store and auto-synchronize your word pairs directly on your Google Drive.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="border-t border-[#334155]/60 pt-5 space-y-3">
              <div className="flex items-start gap-3 text-xs text-slate-300">
                <div className="w-5 h-5 rounded bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Cloud className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-semibold text-slate-200">Zero Manual Push / Pull:</span>{' '}
                  <span className="text-slate-400">
                    Changes save and sync automatically behind the scenes.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-slate-300">
                <div className="w-5 h-5 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-semibold text-slate-200">Timestamped Session Tracking:</span>{' '}
                  <span className="text-slate-400">
                    Never lose edits across sessions or devices with smart timestamping.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-slate-300">
                <div className="w-5 h-5 rounded bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-semibold text-slate-200">Spy Game Relations:</span>{' '}
                  <span className="text-slate-400">
                    Instant mutual word pairs and tag categorization for game sessions.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Privacy Note */}
          <p className="text-[11px] text-center text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Files are stored privately in your personal Google Drive account.</span>
          </p>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-[#334155]/40 py-3 text-center text-xs text-slate-500">
        Spy Dictionary • Google Drive Cloud Auto-Sync
      </footer>
    </div>
  );
};
