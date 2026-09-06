import React, { useState, useEffect, useCallback } from 'react';
import Markdown from 'react-markdown';
import {
  X,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Code,
  Sliders,
  AlertCircle,
  Link2,
  ChevronDown,
  ChevronUp,
  Terminal,
  Cpu,
  Info,
} from 'lucide-react';
import { Word } from '../types';
import {
  getCustomCluePrompt,
  buildCluePrompt,
  generateAiClueApi,
  AiClueError,
  safeFormatErrorMessage,
  type TechnicalErrorDetails,
} from '../utils/aiClue';
import { copyToClipboard } from '../utils/homoglyph';

interface AiClueModalProps {
  isOpen: boolean;
  word: Word | null;
  allWordsMap: Map<string, Word>;
  onClose: () => void;
  onOpenSettingsPrompt?: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AiClueModal: React.FC<AiClueModalProps> = ({
  isOpen,
  word,
  allWordsMap,
  onClose,
  onOpenSettingsPrompt,
  onToast,
}) => {
  const [promptText, setPromptText] = useState<string>('');
  const [responseContent, setResponseContent] = useState<string>('');
  const [activeModelName, setActiveModelName] = useState<string>('Gemini AI');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [technicalDetails, setTechnicalDetails] = useState<TechnicalErrorDetails | null>(null);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(true);
  const [copiedDiagnostics, setCopiedDiagnostics] = useState<boolean>(false);
  const [copiedResponse, setCopiedResponse] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [isPromptExpanded, setIsPromptExpanded] = useState<boolean>(true);
  const [isEditingPrompt, setIsEditingPrompt] = useState<boolean>(false);

  // Compute related words list
  const relatedWordNames = React.useMemo(() => {
    if (!word) return [];
    return word.relations
      .map((rel) => allWordsMap.get(rel.targetWordId)?.term)
      .filter((term): term is string => Boolean(term));
  }, [word, allWordsMap]);

  // Generate Clue Trigger
  const handleGenerate = useCallback(
    async (customPromptToUse?: string) => {
      if (!word) return;

      const activePrompt =
        customPromptToUse !== undefined
          ? customPromptToUse
          : buildCluePrompt(getCustomCluePrompt(), word.term, relatedWordNames);

      setPromptText(activePrompt);
      setIsLoading(true);
      setErrorMessage(null);
      setTechnicalDetails(null);

      try {
        const result = await generateAiClueApi(activePrompt, word.term);
        setResponseContent(result.text);
        if (result.modelUsed) {
          setActiveModelName(result.modelUsed);
        }
        if (result.technicalDetails) {
          setTechnicalDetails(result.technicalDetails);
        }
      } catch (err: unknown) {
        if (err instanceof AiClueError) {
          setErrorMessage(err.message);
          setTechnicalDetails(err.technicalDetails || null);
        } else {
          const msg = safeFormatErrorMessage(err);
          setErrorMessage(msg);
          setTechnicalDetails({
            message: msg,
            errorCode: 'UNKNOWN_CLIENT_EXCEPTION',
            timestamp: new Date().toISOString(),
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [word, relatedWordNames]
  );

  // When modal opens with a new word, auto-generate
  useEffect(() => {
    if (isOpen && word) {
      setResponseContent('');
      setErrorMessage(null);
      setTechnicalDetails(null);
      setIsEditingPrompt(false);
      const initialPrompt = buildCluePrompt(
        getCustomCluePrompt(),
        word.term,
        relatedWordNames
      );
      setPromptText(initialPrompt);
      handleGenerate(initialPrompt);
    }
  }, [isOpen, word, relatedWordNames, handleGenerate]);

  // Copy AI response
  const handleCopyResponse = async () => {
    if (!responseContent) return;
    await copyToClipboard(responseContent);
    setCopiedResponse(true);
    onToast('AI Clues copied to clipboard!', 'success');
    setTimeout(() => setCopiedResponse(false), 1500);
  };

  // Copy prompt text
  const handleCopyPrompt = async () => {
    if (!promptText) return;
    await copyToClipboard(promptText);
    setCopiedPrompt(true);
    onToast('Prompt copied to clipboard!', 'info');
    setTimeout(() => setCopiedPrompt(false), 1500);
  };

  // Copy technical diagnostics payload
  const handleCopyDiagnostics = async () => {
    const payload = {
      errorMessage,
      activeModelName,
      technicalDetails,
      promptText,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };
    await copyToClipboard(JSON.stringify(payload, null, 2));
    setCopiedDiagnostics(true);
    onToast('Technical diagnostics copied to clipboard!', 'info');
    setTimeout(() => setCopiedDiagnostics(false), 1800);
  };

  if (!isOpen || !word) return null;

  return (
    <div
      id="ai-clue-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="ai-clue-modal-dialog"
        role="dialog"
        aria-modal="true"
        className="bg-[#0F172A] border border-violet-500/30 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl shadow-violet-950/40 overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <header className="px-4 sm:px-6 py-3.5 bg-gradient-to-r from-[#1E293B] to-[#161F33] border-b border-[#334155] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-100">
                  AI Clue Generator
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  {activeModelName}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Generate subtle, tactical hints for the word game
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-ai-clue-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Word Info Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#131E35] border-b border-[#28354D] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Target Word:
            </span>
            <span className="text-sm font-bold text-sky-300 bg-sky-950/70 border border-sky-800/80 px-2.5 py-0.5 rounded-md">
              {word.term}
            </span>

            {relatedWordNames.length > 0 ? (
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Link2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Related:</span>
                <span className="text-slate-300 font-medium">
                  {relatedWordNames.join(', ')}
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-500 italic">
                (No linked relations)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onOpenSettingsPrompt && (
              <button
                type="button"
                id="btn-modal-settings-prompt"
                onClick={() => {
                  onClose();
                  onOpenSettingsPrompt();
                }}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-violet-300 transition-colors cursor-pointer py-1 px-2 rounded hover:bg-slate-800"
                title="Edit default prompt template in Settings"
              >
                <Sliders className="w-3.5 h-3.5 text-violet-400" />
                <span>Settings Template</span>
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* AI Response Box */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  AI Generated Clues
                </h3>
              </div>

              {responseContent && !isLoading && (
                <button
                  type="button"
                  id="btn-copy-ai-clue-response"
                  onClick={handleCopyResponse}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded border border-[#334155] transition-colors cursor-pointer"
                  title="Copy AI clues to clipboard"
                >
                  {copiedResponse ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>Copy Clues</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {isLoading ? (
              <div
                id="ai-clue-loading-state"
                className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center space-y-3 text-center"
              >
                <RefreshCw className="w-6 h-6 text-violet-400 animate-spin" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-200">
                    Crafting tactical clues with Gemini AI...
                  </p>
                  <p className="text-xs text-slate-400">
                    Formulating clues subtle enough to confuse the Spy.
                  </p>
                </div>
              </div>
            ) : errorMessage ? (
              <div
                id="ai-clue-error-state"
                className="bg-rose-950/25 border border-rose-800/50 rounded-xl p-4 text-xs space-y-3 text-rose-200"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-semibold text-rose-300 text-sm">
                        AI Clue Generation Failed
                      </p>
                      {technicalDetails?.httpStatus && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-900/60 text-rose-200 border border-rose-700/60 font-semibold">
                            HTTP {technicalDetails.httpStatus}
                          </span>
                          {technicalDetails.errorCode && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900/80 text-rose-300 border border-slate-700">
                              {technicalDetails.errorCode}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <p className="text-rose-200/90 text-xs leading-relaxed">
                      {errorMessage}
                    </p>
                  </div>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                  <button
                    type="button"
                    id="btn-retry-ai-clue"
                    onClick={() => handleGenerate(promptText)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-semibold rounded-lg transition-colors cursor-pointer text-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>

                  <button
                    type="button"
                    id="btn-copy-technical-diagnostics"
                    onClick={handleCopyDiagnostics}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg border border-slate-700 transition-colors cursor-pointer text-xs"
                    title="Copy full technical diagnostics JSON to clipboard"
                  >
                    {copiedDiagnostics ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-300">Copied Diagnostics</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Diagnostics</span>
                      </>
                    )}
                  </button>

                  {onOpenSettingsPrompt && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSettingsPrompt();
                      }}
                      className="px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700/60 transition-colors cursor-pointer text-xs"
                    >
                      API Settings
                    </button>
                  )}
                </div>

                {/* Expandable Technical Diagnostics Details */}
                <div
                  id="technical-diagnostics-drawer"
                  className="mt-2 border border-slate-800 bg-slate-950/70 rounded-lg overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setIsDiagnosticsOpen(!isDiagnosticsOpen)}
                    className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-mono font-semibold text-slate-300 hover:bg-slate-900/80 transition-colors cursor-pointer border-b border-slate-800/60"
                  >
                    <div className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-violet-400" />
                      <span>Technical Diagnostics & Model Fallback Trail</span>
                    </div>
                    {isDiagnosticsOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>

                  {isDiagnosticsOpen && (
                    <div className="p-3 space-y-3 text-[11px] font-mono text-slate-300">
                      {/* Model Attempts Trail */}
                      {technicalDetails?.modelsAttempted && technicalDetails.modelsAttempted.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] uppercase font-sans font-bold tracking-wider text-slate-400">
                            Model Execution Attempts:
                          </p>
                          <div className="space-y-1">
                            {technicalDetails.modelsAttempted.map((att, idx) => (
                              <div
                                key={idx}
                                className="flex items-start justify-between gap-2 p-1.5 rounded bg-slate-900/90 border border-slate-800/80 text-[10px]"
                              >
                                <div className="flex items-center gap-2">
                                  <Cpu className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="font-semibold text-sky-300">{att.model}</span>
                                  <span className="text-slate-500">({att.durationMs}ms)</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-right">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                      att.status === 'success'
                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                                    }`}
                                  >
                                    {att.status.toUpperCase()}
                                  </span>
                                  {att.errorCode && (
                                    <span className="text-slate-400 font-mono text-[9px]">
                                      [{att.errorCode}]
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Technical Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-sans">
                        <div className="p-2 rounded bg-slate-900/60 border border-slate-800/60 space-y-0.5">
                          <span className="text-slate-400 block font-semibold">Diagnostic Code</span>
                          <span className="text-rose-300 font-mono">
                            {technicalDetails?.errorCode || 'NO_CODE'}
                          </span>
                        </div>
                        <div className="p-2 rounded bg-slate-900/60 border border-slate-800/60 space-y-0.5">
                          <span className="text-slate-400 block font-semibold">API Key Configured</span>
                          <span
                            className={`font-mono ${
                              technicalDetails?.apiKeyConfigured !== false
                                ? 'text-emerald-400'
                                : 'text-rose-400 font-bold'
                            }`}
                          >
                            {technicalDetails?.apiKeyConfigured !== false ? 'Yes (Present in backend)' : 'No (Missing)'}
                          </span>
                        </div>
                      </div>

                      {/* Common Causes & Remediation Advice */}
                      <div className="p-2 rounded bg-amber-950/20 border border-amber-900/40 text-amber-200/90 text-[10px] font-sans leading-relaxed flex items-start gap-2">
                        <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-amber-300 font-semibold">Root Cause Guide:</strong>
                          <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-amber-200/80">
                            <li>
                              <strong>503 Unavailable / High Demand:</strong> Google's cloud server is experiencing high regional traffic. The system has automatically reordered candidate models to use faster lite models (<code className="font-mono text-amber-100">gemini-3.5-flash-lite</code>).
                            </li>
                            <li>
                              <strong>Missing API Key:</strong> Make sure <code className="font-mono text-amber-100">GEMINI_API_KEY</code> is set in the environment Settings &gt; Secrets.
                            </li>
                          </ul>
                        </div>
                      </div>

                      {/* Raw Payload Preview */}
                      {technicalDetails?.rawError && (
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-sans font-bold tracking-wider text-slate-400 block">
                            Raw Backend Trace:
                          </span>
                          <pre className="p-2 bg-black/60 rounded border border-slate-800/80 text-[9px] text-slate-300 overflow-x-auto max-h-28 whitespace-pre-wrap break-all">
                            {technicalDetails.rawError}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : responseContent ? (
              <div
                id="ai-clue-response-body"
                className="bg-[#1E293B] border border-[#334155] rounded-xl p-4 sm:p-5 text-slate-200 text-xs sm:text-sm leading-relaxed space-y-3"
              >
                <div className="prose prose-invert prose-sm max-w-none text-slate-200 space-y-2">
                  <Markdown>{responseContent}</Markdown>
                </div>
              </div>
            ) : (
              <div className="bg-[#1E293B] border border-[#334155] rounded-xl p-6 text-center text-xs text-slate-400">
                Click Generate to receive clever clues for "{word.term}".
              </div>
            )}
          </section>

          {/* Prompt Section (Showing the Response Prompt) */}
          <section className="bg-[#161F33] border border-[#2B3B59] rounded-xl overflow-hidden shadow-xs">
            <div
              className="px-4 py-2.5 bg-[#1B2740] flex items-center justify-between cursor-pointer select-none"
              onClick={() => setIsPromptExpanded(!isPromptExpanded)}
            >
              <div className="flex items-center gap-2">
                <Code className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs font-semibold text-slate-200">
                  Response Prompt Sent to AI
                </span>
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                  (Interpolated with "{word.term}")
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopyPrompt();
                  }}
                  className="p-1 text-slate-400 hover:text-sky-300 rounded hover:bg-slate-800 transition-colors"
                  title="Copy prompt text"
                >
                  {copiedPrompt ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <span className="text-slate-400 p-0.5">
                  {isPromptExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </span>
              </div>
            </div>

            {isPromptExpanded && (
              <div className="p-3 sm:p-4 space-y-2.5">
                {isEditingPrompt ? (
                  <div className="space-y-2">
                    <textarea
                      id="textarea-ai-modal-prompt-edit"
                      value={promptText}
                      onChange={(e) => setPromptText(e.target.value)}
                      rows={6}
                      className="w-full bg-[#0F172A] border border-sky-500/50 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-sky-400 resize-y"
                      placeholder="Customize prompt for this generation..."
                    />
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const resetPrompt = buildCluePrompt(
                            getCustomCluePrompt(),
                            word.term,
                            relatedWordNames
                          );
                          setPromptText(resetPrompt);
                        }}
                        className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        Reset to default template
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingPrompt(false)}
                          className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingPrompt(false);
                            handleGenerate(promptText);
                          }}
                          className="px-3 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold rounded-md transition-colors cursor-pointer"
                        >
                          Generate with this Prompt
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <pre className="text-[11px] text-slate-300 font-mono whitespace-pre-wrap bg-[#0F172A] p-3 rounded-lg border border-[#23314D] max-h-44 overflow-y-auto leading-relaxed">
                      {promptText}
                    </pre>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] text-slate-500">
                        Template can also be configured permanently in Settings.
                      </span>
                      <button
                        type="button"
                        id="btn-edit-prompt-inline"
                        onClick={() => setIsEditingPrompt(true)}
                        className="text-xs text-sky-400 hover:text-sky-300 hover:underline cursor-pointer"
                      >
                        Tweak prompt for this word
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Modal Footer Controls */}
        <footer className="px-4 sm:px-6 py-3 bg-[#1E293B] border-t border-[#334155] flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-[#334155] rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-regenerate-ai-clue"
              onClick={() => handleGenerate(promptText)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`}
              />
              <span>{isLoading ? 'Generating...' : 'Regenerate Clues'}</span>
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
