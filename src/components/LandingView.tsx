import React from 'react';
import { ShieldCheck, Cloud, AlertCircle, Loader2, Sparkles, VenetianMask } from 'lucide-react';

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
      className="min-h-screen bg-[#0F172A] text-slate-100 flex flex-col justify-center items-center px-4 py-8 font-sans selection:bg-sky-500/30 selection:text-sky-200"
    >
      <div className="w-full max-w-sm mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Icon & Heading */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/25 text-sky-400 mx-auto flex items-center justify-center text-3xl shadow-lg shadow-sky-950/40">
            🕵️
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Spy Dictionary
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Kamus pasangan kata rahasia undercover dengan sinkronisasi Google Drive.
            </p>
          </div>
        </div>

        {/* Card Content */}
        <div className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6 shadow-xl shadow-slate-950/60 space-y-4">
          {/* Error Notice */}
          {(isTokenExpired || lastError) && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-xs">
                  {isTokenExpired ? 'Sesi Google Berakhir' : 'Pemberitahuan Akun'}
                </p>
                <p className="text-amber-300/80 text-[11px] leading-relaxed">
                  {lastError || 'Silakan masuk kembali dengan Google untuk melanjutkan sinkronisasi.'}
                </p>
              </div>
            </div>
          )}

          {/* Action Button: Sign In or Loading */}
          {isAuthLoading ? (
            <div className="flex items-center justify-center gap-2.5 py-3.5 text-slate-400 text-xs font-medium bg-slate-900/60 border border-[#334155] rounded-xl">
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
              <span>Memeriksa sesi Google...</span>
            </div>
          ) : (
            <button
              id="btn-landing-google-signin"
              onClick={onSignIn}
              disabled={isSigningIn}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-900 font-semibold text-sm rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-700" />
                  <span>Menghubungkan Google Drive...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                  <span>Masuk dengan Google</span>
                </>
              )}
            </button>
          )}

          {/* Clean 3 Minimal Feature Chips */}
          <div className="pt-2 flex items-center justify-center gap-1.5 flex-wrap text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/60 border border-slate-700/60 text-slate-300">
              <Cloud className="w-3 h-3 text-sky-400" />
              <span>Auto-Sync</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/60 border border-slate-700/60 text-slate-300">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>Memory Game</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/60 border border-slate-700/60 text-slate-300">
              <VenetianMask className="w-3 h-3 text-amber-400" />
              <span>Anti-Sensor</span>
            </span>
          </div>
        </div>

        {/* Minimal Footer Note */}
        <p className="text-[11px] text-center text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Database kamus tersimpan privat di Google Drive akun Anda.</span>
        </p>
      </div>
    </div>
  );
};
