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
} from 'lucide-react';
import { Word } from '../types';
import {
  getCustomCluePrompt,
  buildCluePrompt,
  generateAiClueApi,
  getSelectedGeminiModel,
  getGeminiTemperature,
  getGeminiClueStyle,
  getGeminiClueCount,
  GEMINI_STYLE_PRESETS,
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

      const style = getGeminiClueStyle();
      const count = getGeminiClueCount();
      const model = getSelectedGeminiModel();
      const temperature = getGeminiTemperature();

      const activePrompt =
        customPromptToUse !== undefined
          ? customPromptToUse
          : buildCluePrompt(getCustomCluePrompt(), word.term, relatedWordNames, style, count);

      setPromptText(activePrompt);
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result = await generateAiClueApi(activePrompt, word.term, {
          model,
          temperature,
        });
        setResponseContent(result.text);
        if (result.modelUsed) {
          setActiveModelName(result.modelUsed);
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : 'An unexpected error occurred while communicating with Gemini AI.';
        setErrorMessage(msg);
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
      setIsEditingPrompt(false);
      const style = getGeminiClueStyle();
      const count = getGeminiClueCount();
      const initialPrompt = buildCluePrompt(
        getCustomCluePrompt(),
        word.term,
        relatedWordNames,
        style,
        count
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

  if (!isOpen || !word) return null;

  return (
    <div
      id="ai-clue-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="ai-clue-modal-dialog"
        role="dialog"
        aria-modal="true"
        className="bg-[#112240] border border-[#233554] rounded-xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-sm overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <header className="px-4 sm:px-6 py-3.5 bg-[#0A192F] border-b border-[#233554] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-[#F8FAFC] tracking-tight">
                  AI Clue Generator
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  {activeModelName}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                Generate subtle, tactical hints for the word game
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-ai-clue-modal"
            onClick={onClose}
            className="text-[#94A3B8] hover:text-[#F8FAFC] p-1.5 rounded-lg hover:bg-[#1E293B] transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Word Info Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#080F1E] border-b border-[#233554] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide">
              Target Word:
            </span>
            <span className="text-sm font-bold text-[#00D2FF] bg-[#00D2FF]/10 border border-[#00D2FF]/30 px-2.5 py-0.5 rounded-lg">
              {word.term}
            </span>

            {relatedWordNames.length > 0 ? (
              <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
                <Link2 className="w-3.5 h-3.5 text-[#94A3B8]/70" />
                <span>Related:</span>
                <span className="text-[#F8FAFC] font-medium">
                  {relatedWordNames.join(', ')}
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-[#94A3B8]/70 italic">
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
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#F8FAFC] hover:text-[#00D2FF] transition-colors cursor-pointer py-1 px-2.5 rounded-lg bg-[#112240] hover:bg-[#1E293B] border border-[#233554]"
                title="Configure Gemini API Key, model, temperature, and prompt template"
              >
                <Sliders className="w-3.5 h-3.5 text-[#00D2FF]" />
                <span>Gemini Settings</span>
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
                <h3 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                  AI Generated Clues
                </h3>
              </div>

              {responseContent && !isLoading && (
                <button
                  type="button"
                  id="btn-copy-ai-clue-response"
                  onClick={handleCopyResponse}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#F8FAFC] bg-[#112240] hover:bg-[#1E293B] px-2.5 py-1 rounded-lg border border-[#233554] transition-colors cursor-pointer"
                  title="Copy AI clues to clipboard"
                >
                  {copiedResponse ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-[#94A3B8]" />
                      <span>Copy Clues</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {isLoading ? (
              <div
                id="ai-clue-loading-state"
                className="bg-[#080F1E] border border-[#233554] rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center space-y-3 text-center"
              >
                <RefreshCw className="w-6 h-6 text-[#00D2FF] animate-spin" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-[#F8FAFC]">
                    Crafting tactical clues with Gemini AI...
                  </p>
                  <p className="text-xs text-[#94A3B8]">
                    Formulating clues subtle enough to confuse the Spy.
                  </p>
                </div>
              </div>
            ) : errorMessage ? (
              <div
                id="ai-clue-error-state"
                className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-4 text-xs space-y-2.5 text-rose-300"
              >
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <p className="font-semibold text-rose-200">
                      Failed to generate clue
                    </p>
                    <p className="text-rose-300/90 leading-relaxed">
                      {errorMessage}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleGenerate(promptText)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                  {onOpenSettingsPrompt && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenSettingsPrompt();
                      }}
                      className="px-3 py-1.5 bg-[#112240] hover:bg-[#1E293B] text-[#F8FAFC] border border-[#233554] rounded-lg transition-colors cursor-pointer"
                    >
                      Check API Settings
                    </button>
                  )}
                </div>
              </div>
            ) : responseContent ? (
              <div
                id="ai-clue-response-body"
                className="bg-[#080F1E] border border-[#233554] rounded-xl p-4 sm:p-5 text-[#F8FAFC] text-xs sm:text-sm leading-relaxed space-y-3"
              >
                <div className="prose prose-invert prose-sm max-w-none text-[#F8FAFC] space-y-2">
                  <Markdown>{responseContent}</Markdown>
                </div>
              </div>
            ) : (
              <div className="bg-[#080F1E] border border-[#233554] rounded-xl p-6 text-center text-xs text-[#94A3B8]">
                Click Generate to receive clever clues for "{word.term}".
              </div>
            )}
          </section>

          {/* Prompt Section (Showing the Response Prompt) */}
          <section className="bg-[#080F1E] border border-[#233554] rounded-xl overflow-hidden shadow-sm">
            <div
              className="px-4 py-2.5 bg-[#0A192F] flex items-center justify-between cursor-pointer select-none"
              onClick={() => setIsPromptExpanded(!isPromptExpanded)}
            >
              <div className="flex items-center gap-2">
                <Code className="w-3.5 h-3.5 text-[#00D2FF]" />
                <span className="text-xs font-semibold text-[#F8FAFC]">
                  Response Prompt Sent to AI
                </span>
                <span className="text-[10px] text-[#94A3B8] font-mono hidden sm:inline">
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
                  className="p-1 text-[#94A3B8] hover:text-[#F8FAFC] rounded hover:bg-[#112240] transition-colors"
                  title="Copy prompt text"
                >
                  {copiedPrompt ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <span className="text-[#94A3B8] p-0.5">
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
                      className="w-full bg-[#0A192F] border border-[#233554] focus:border-[#00D2FF] rounded-lg p-2.5 text-xs text-[#F8FAFC] font-mono focus:outline-none focus:ring-1 focus:ring-[#00D2FF] resize-y"
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
                        className="text-[11px] text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                      >
                        Reset to default template
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingPrompt(false)}
                          className="px-2.5 py-1 text-xs text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingPrompt(false);
                            handleGenerate(promptText);
                          }}
                          className="px-3 py-1 bg-[#00D2FF] hover:bg-[#38BDF8] text-[#0A192F] text-xs font-semibold rounded-lg transition-all cursor-pointer active:scale-[0.98]"
                        >
                          Generate with this Prompt
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <pre className="text-[11px] text-[#F8FAFC] font-mono whitespace-pre-wrap bg-[#0A192F] p-3 rounded-lg border border-[#233554] max-h-44 overflow-y-auto leading-relaxed">
                      {promptText}
                    </pre>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] text-[#94A3B8]">
                        Template can also be configured permanently in Settings.
                      </span>
                      <button
                        type="button"
                        id="btn-edit-prompt-inline"
                        onClick={() => setIsEditingPrompt(true)}
                        className="text-xs text-[#00D2FF] hover:text-[#38BDF8] hover:underline cursor-pointer font-semibold"
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
        <footer className="px-4 sm:px-6 py-3 bg-[#0A192F] border-t border-[#233554] flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-[#F8FAFC] hover:bg-[#1E293B] bg-[#112240] border border-[#233554] rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-regenerate-ai-clue"
              onClick={() => handleGenerate(promptText)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00D2FF] hover:bg-[#38BDF8] text-[#0A192F] text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-40 disabled:hover:bg-[#00D2FF] active:scale-[0.98]"
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
