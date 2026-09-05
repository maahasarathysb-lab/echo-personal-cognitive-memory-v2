import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Interaction, AskPastSelfResponse } from '../types';
import {
  Brain,
  Sparkles,
  Search,
  AlertCircle,
  RefreshCw,
  Loader2,
  ArrowLeft,
  Calendar,
  Quote,
  ShieldCheck,
} from 'lucide-react';

interface AskPastSelfViewProps {
  user: User;
  interactions: Interaction[];
  onBackToReflect: () => void;
}

const SAMPLE_QUESTIONS = [
  'What was I worried about previously?',
  'How has my thinking about my career changed?',
  'What decisions have I struggled with repeatedly?',
  'What did I believe about this topic before?',
  'Have I mentioned this problem in earlier reflections?',
];

export const AskPastSelfView: React.FC<AskPastSelfViewProps> = ({
  user,
  interactions,
  onBackToReflect,
}) => {
  const [question, setQuestion] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSubmittedQuestion, setLastSubmittedQuestion] = useState<string | null>(null);
  const [result, setResult] = useState<AskPastSelfResponse | null>(null);

  const handleAsk = async (queryText?: string) => {
    const q = (queryText !== undefined ? queryText : question).trim();
    if (!q || isQuerying) return;

    setIsQuerying(true);
    setError(null);
    setLastSubmittedQuestion(q);
    if (queryText !== undefined) {
      setQuestion(queryText);
    }

    try {
      const idToken = await user.getIdToken();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);

      const response = await fetch('/api/gemini/ask-past-self', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          question: q,
          clientMemories: interactions,
        }),
        signal: controller.signal,
      }).finally(() => {
        clearTimeout(timer);
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with HTTP ${response.status}`);
      }

      const data: AskPastSelfResponse = await response.json();
      setResult(data);
    } catch (err: unknown) {
      console.error('Ask Past Self error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown communication error';
      setError(
        msg.includes('abort')
          ? 'Memory query timed out after 45 seconds. Please retry.'
          : msg || 'Unable to query historical memories at this moment.'
      );
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div id="ask-past-self-view" className="flex-1 flex flex-col h-full bg-[#0a0a0a] overflow-hidden">
      {/* Top Header */}
      <header className="h-16 border-b border-[#222222] flex items-center justify-between px-6 sm:px-8 bg-[#0a0a0a]/60 backdrop-blur-sm sticky top-0 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button
            id="back-to-reflect-btn"
            onClick={onBackToReflect}
            className="p-1.5 rounded-lg border border-[#222222] bg-[#111111] hover:bg-[#1a1a1a] text-[#888888] hover:text-white transition cursor-pointer"
            title="Return to active reflection"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-white">Ask Your Past Self</h2>
              <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-teal-950/60 text-teal-400 border border-teal-800/40">
                Grounded Memory Recall
              </span>
            </div>
            <p className="text-[10px] text-[#555555]">
              {interactions.length} {interactions.length === 1 ? 'reflection' : 'reflections'} available in private storage
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-[#555555]">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
          <span>Owner Isolated</span>
        </div>
      </header>

      {/* Main Content Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 sm:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Hero Prompt Card */}
          <div className="p-6 rounded-2xl bg-[#111111] border border-[#222222] space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                <Brain className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-medium text-white">What would you like to remember?</h3>
                <p className="text-xs text-[#888888] leading-relaxed">
                  Converse with your past thinking. Ask questions about your recurring worries, career dilemmas, beliefs, or patterns. ECHO grounds its answers strictly in your recorded reflections without inventing memories.
                </p>
              </div>
            </div>

            {/* Suggestions Chips */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] uppercase tracking-widest text-[#555555] font-semibold">
                Suggested questions:
              </span>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_QUESTIONS.map((sampleQ, idx) => (
                  <button
                    key={idx}
                    id={`sample-question-btn-${idx}`}
                    onClick={() => handleAsk(sampleQ)}
                    disabled={isQuerying}
                    className="text-xs py-1.5 px-3 rounded-full border border-[#262626] bg-[#161616] text-[#aaaaaa] hover:text-white hover:border-[#3a3a3a] hover:bg-[#202020] transition-colors cursor-pointer text-left"
                  >
                    {sampleQ}
                  </button>
                ))}
              </div>
            </div>

            {/* Input & Action */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk();
              }}
              className="space-y-3 pt-2"
            >
              <div className="relative">
                <input
                  id="ask-past-self-input"
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g., What was I struggling with in earlier reflections?"
                  disabled={isQuerying}
                  className="w-full bg-[#161616] border border-[#333333] rounded-xl px-4 py-3 text-sm text-white placeholder-[#555555] focus:outline-none focus:border-teal-500/60 transition-colors"
                  maxLength={1000}
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-[#555555]">
                  Strictly grounded • Zero hallucinated memories
                </span>
                <button
                  id="ask-past-self-submit-btn"
                  type="submit"
                  disabled={isQuerying || !question.trim()}
                  className="py-2.5 px-6 rounded-lg bg-teal-600 hover:bg-teal-500 text-[#0a0a0a] font-medium text-xs flex items-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                  {isQuerying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>SEARCHING MEMORIES...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>ASK ECHO</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Loading Indicator */}
          {isQuerying && (
            <div
              id="past-self-loading-state"
              className="p-8 rounded-2xl bg-[#111111]/60 border border-[#222222] flex flex-col items-center justify-center text-center space-y-3"
            >
              <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-white">ECHO is recalling your past reflections...</p>
                <p className="text-[11px] text-[#666666]">
                  Searching historical interactions and formulating grounded synthesis
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div
              id="past-self-error-banner"
              className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
              {lastSubmittedQuestion && (
                <button
                  id="retry-past-self-btn"
                  onClick={() => handleAsk(lastSubmittedQuestion)}
                  className="px-3 py-1 bg-rose-900/60 hover:bg-rose-900 border border-rose-800/80 text-rose-200 rounded text-xs font-medium flex items-center gap-1.5 transition shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              )}
            </div>
          )}

          {/* Result Presentation */}
          {result && !isQuerying && (
            <div id="past-self-result-container" className="space-y-6 pt-2">
              {/* Query Recap */}
              <div className="flex items-center justify-between text-xs px-2 text-[#777777]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#555555] uppercase tracking-wider text-[10px]">
                    Question:
                  </span>
                  <span className="text-white italic">&ldquo;{lastSubmittedQuestion}&rdquo;</span>
                </div>
                {result.model && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#222222] text-[#666666]">
                    {result.model}
                  </span>
                )}
              </div>

              {/* Sequential Presentation: QUESTION -> MEMORIES ECHO FOUND -> HOW YOUR THINKING EVOLVED -> ECHO'S INTERPRETATION */}

              {/* 1. MEMORIES ECHO FOUND - STRICTLY ONLY IF SUFFICIENT MEMORIES FOUND */}
              {result.hasEnoughMemories && result.supportingMemories && result.supportingMemories.length > 0 && (
                <div id="past-self-supporting-memories" className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" />
                      MEMORIES ECHO FOUND
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {result.supportingMemories.length} evidence citation{result.supportingMemories.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.supportingMemories.map((mem, mIdx) => (
                      <div
                        key={mIdx}
                        id={`supporting-memory-${mIdx}`}
                        className="p-4 rounded-xl bg-[#11141e] border border-[#1e2332] space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-white line-clamp-1">
                            {mem.reflectionTitle || 'Past Reflection'}
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-teal-400 font-mono shrink-0">
                            <Calendar className="w-3 h-3" />
                            <span>{mem.date || 'Past date'}</span>
                          </div>
                        </div>

                        {mem.excerpt && (
                          <div className="flex items-start gap-2 pt-1">
                            <Quote className="w-3 h-3 text-slate-600 shrink-0 mt-0.5" />
                            <p className="text-xs text-slate-400 leading-relaxed italic line-clamp-3">
                              &ldquo;{mem.excerpt}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. HOW YOUR THINKING EVOLVED (ANSWER) Card */}
              <div
                id="past-self-answer-card"
                className="p-6 rounded-xl bg-[#11141e] border border-[#1e2332] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">
                    HOW YOUR THINKING EVOLVED
                  </span>
                  {result.hasEnoughMemories ? (
                    <span className="text-[10px] text-teal-400 font-medium">Grounded in verified memories</span>
                  ) : (
                    <span className="text-[10px] text-amber-400 font-medium">Insufficient memory context</span>
                  )}
                </div>
                <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap font-normal">
                  {result.answer}
                </p>
              </div>

              {/* 3. ECHO'S INTERPRETATION Section - STRICTLY ONLY IF SUFFICIENT MEMORIES FOUND */}
              {result.hasEnoughMemories && Boolean(result.interpretation) && (
                <div
                  id="past-self-interpretation-card"
                  className="p-6 rounded-xl bg-[#0f141f] border border-teal-500/30 space-y-2.5"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-teal-400" />
                    <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest">
                      ECHO&apos;S COGNITIVE INTERPRETATION
                    </span>
                    <span className="text-[9px] text-teal-400/70 ml-auto uppercase tracking-wider font-mono">
                      Pattern Synthesis
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    AI analysis of your cognitive shifts and emotional consistency across time.
                  </p>
                  <p className="text-xs leading-relaxed text-teal-100/90 whitespace-pre-wrap pt-1">
                    {result.interpretation}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
