import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Interaction, AskPastSelfResponse } from '../types';
import {
  Sparkles,
  ArrowLeft,
  Calendar,
  AlertCircle,
  Loader2,
  Brain,
  Search,
  ArrowUpRight,
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
  'Have I mentioned this dilemma in earlier reflections?',
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
          ? 'Memory inquiry timed out after 45 seconds. Please retry.'
          : msg || 'Unable to query historical memories at this moment.'
      );
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div id="ask-past-self-view" className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <header className="space-y-2 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToReflect}
              className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.04] transition cursor-pointer"
              title="Return to Reflect"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono tracking-[0.25em] text-teal-400 uppercase font-medium">
              ASK YOUR PAST SELF
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-500">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            <span>{interactions.length} reflections indexed</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-neutral-100">
          Somewhere in your past, you already thought about this.
        </h1>

        <p className="text-sm text-neutral-400 leading-relaxed max-w-2xl font-normal">
          Inquire into your past mindset. ECHO searches across your private reflections to synthesize how your thinking has evolved over time.
        </p>
      </header>

      {/* Query Surface */}
      <section className="bg-[#0b0e15]/90 border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-[0_15px_35px_rgba(0,0,0,0.5)] backdrop-blur-md focus-within:border-teal-500/40 transition-all text-left">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor="past-self-query-input" className="text-[11px] font-mono tracking-wider text-neutral-400 uppercase">
              What are you curious about?
            </label>
            <textarea
              id="past-self-query-input"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
              disabled={isQuerying}
              placeholder="e.g., What did I believe about my career direction six months ago, and what was I hesitating on?"
              className="w-full bg-transparent border-0 text-sm sm:text-base text-neutral-100 placeholder:text-neutral-500 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_QUESTIONS.slice(0, 3).map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAsk(sample)}
                  className="text-[11px] font-mono text-neutral-400 hover:text-teal-300 bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg px-2.5 py-1 transition cursor-pointer"
                >
                  &ldquo;{sample.slice(0, 32)}...&rdquo;
                </button>
              ))}
            </div>

            <button
              id="ask-query-btn"
              type="submit"
              disabled={isQuerying || !question.trim()}
              className="h-10 px-5 bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 hover:text-teal-200 border border-teal-500/30 rounded-xl text-xs font-mono tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 shrink-0 ml-auto"
            >
              {isQuerying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
                  <span>Searching Past...</span>
                </>
              ) : (
                <>
                  <span>Consult Past Self</span>
                  <ArrowUpRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-300 text-xs flex items-center gap-3 text-left">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Synthesis State */}
      {isQuerying && (
        <div className="py-14 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
          <p className="text-xs text-neutral-300 font-mono tracking-wide">
            Searching chronological reflection field and synthesizing cognitive trajectory...
          </p>
        </div>
      )}

      {/* Result Presentation */}
      {!isQuerying && result && (
        <div className="space-y-8 text-left animate-fadeIn">
          {/* Inquiry Context / Telemetry */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
            <div>
              <span className="text-neutral-500 uppercase tracking-widest text-[9.5px] block">
                I WENT LOOKING THROUGH YOUR PAST
              </span>
              <span className="text-neutral-300 text-sm mt-0.5 block font-sans font-medium">
                &ldquo;{lastSubmittedQuestion}&rdquo;
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-teal-400/90 shrink-0">
              <span>{interactions.length} reflections searched</span>
              <span>·</span>
              <span>{result.supportingMemories?.length || 0} memories connected</span>
            </div>
          </div>

          {/* HOW YOUR THINKING EVOLVED (Grounded Editorial Synthesis) */}
          <article className="p-6 sm:p-8 rounded-2xl bg-[#0b0e15]/80 border border-teal-500/25 shadow-[0_20px_50px_rgba(0,0,0,0.6)] space-y-4">
            <div className="flex items-center gap-2 text-teal-400 text-xs font-mono tracking-[0.2em] uppercase">
              <Sparkles className="w-4 h-4 text-teal-300" />
              <span>HOW YOUR THINKING EVOLVED</span>
            </div>

            <div className="prose prose-invert max-w-none text-neutral-200 text-sm sm:text-base leading-relaxed font-normal whitespace-pre-wrap">
              {result.answer}
            </div>

            {result.interpretation && (
              <div className="mt-4 pt-4 border-t border-white/[0.06] text-xs text-neutral-400 font-mono italic">
                {result.interpretation}
              </div>
            )}
          </article>

          {/* MEMORIES BEHIND THIS (Connected Timeline Cards) */}
          {result.supportingMemories && result.supportingMemories.length > 0 && (
            <section className="space-y-4 pt-2">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
                <span className="text-[10px] font-mono tracking-[0.25em] text-neutral-400 uppercase font-medium">
                  MEMORIES BEHIND THIS
                </span>
                <span className="text-[10px] font-mono text-neutral-500">
                  {result.supportingMemories.length} historical sources
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.supportingMemories.map((mem, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-2 hover:border-teal-500/30 transition-all text-left"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                      <span className="text-teal-400 font-medium">SOURCE {idx + 1}</span>
                      <span>{mem.date}</span>
                    </div>

                    <h4 className="text-sm font-medium text-neutral-100">
                      {mem.reflectionTitle || 'Historical Reflection'}
                    </h4>

                    <p className="text-xs text-neutral-400 leading-relaxed italic">
                      &ldquo;{mem.excerpt}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
