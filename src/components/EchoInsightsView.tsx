import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Interaction, EchoInsightsResponse } from '../types';
import {
  Lightbulb,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Shield,
  HelpCircle,
  Compass,
  Clock,
  Loader2,
} from 'lucide-react';

interface EchoInsightsViewProps {
  user: User;
  interactions: Interaction[];
}

export const EchoInsightsView: React.FC<EchoInsightsViewProps> = ({
  user,
  interactions,
}) => {
  const [insights, setInsights] = useState<EchoInsightsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();
      const res = await fetch('/api/gemini/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientMemories: interactions,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to retrieve insights');
      }

      const data: EchoInsightsResponse = await res.json();
      setInsights(data);
    } catch (err) {
      console.error('Insights fetch error:', err);
      setError('Unable to load cognitive insights right now. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [user]);

  return (
    <div id="echo-insights-view" className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8 text-left">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono tracking-[0.25em] text-teal-400 uppercase font-medium">
            ECHO INSIGHTS
          </span>
          <button
            id="refresh-insights-btn"
            onClick={fetchInsights}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-mono transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Synthesizing...' : 'Refresh Insights'}</span>
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-neutral-100">
          Patterns emerge when you give your thoughts enough time.
        </h1>

        <p className="text-sm text-neutral-400 leading-relaxed max-w-2xl font-normal">
          Patterns, priority shifts, and enduring themes synthesized strictly from your private reflection archives.
        </p>
      </header>

      {/* Non-Medical Reflection Notice */}
      <div className="bg-[#0b0e15]/70 border border-white/[0.06] rounded-2xl p-4 flex items-start gap-3 text-xs text-neutral-400">
        <Shield className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="text-neutral-300 font-medium">Cognitive Self-Reflection Notice:</span>
          <p className="text-[11px] leading-relaxed text-neutral-400">
            ECHO analyzes cognitive patterns for personal growth and reflective clarity. Insights are strictly derived from your recorded writings and do not constitute clinical, psychiatric, or psychological diagnoses.
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-7 h-7 text-teal-400 animate-spin" />
          <p className="text-xs text-neutral-300 font-mono tracking-wide">
            Synthesizing cognitive patterns across your memories...
          </p>
        </div>
      )}

      {/* Editorial Insights Cards */}
      {!loading && insights && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Row: POSITIVE PROGRESS & SHIFTS IN PRIORITIES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* POSITIVE PROGRESS */}
            <article className="bg-[#0b0e15]/80 border border-white/[0.07] rounded-2xl p-6 space-y-3 shadow-sm">
              <div className="flex items-center gap-2 text-teal-400 text-xs font-mono tracking-widest uppercase font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>POSITIVE PROGRESS</span>
              </div>
              <ul className="space-y-2 pt-1">
                {insights.positiveProgress && insights.positiveProgress.length > 0 ? (
                  insights.positiveProgress.map((item, idx) => (
                    <li key={idx} className="text-xs sm:text-sm text-neutral-200 flex items-start gap-2.5">
                      <span className="text-teal-400 mt-1">&bull;</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))
                ) : (
                  <p className="text-xs text-neutral-500 italic">Progress signals are continuing to develop.</p>
                )}
              </ul>
            </article>

            {/* SHIFTS IN PRIORITIES */}
            <article className="bg-[#0b0e15]/80 border border-white/[0.07] rounded-2xl p-6 space-y-3 shadow-sm">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono tracking-widest uppercase font-medium">
                <TrendingUp className="w-4 h-4" />
                <span>SHIFTS IN PRIORITIES</span>
              </div>
              <ul className="space-y-2 pt-1">
                {insights.changesInPriorities && insights.changesInPriorities.length > 0 ? (
                  insights.changesInPriorities.map((item, idx) => (
                    <li key={idx} className="text-xs sm:text-sm text-neutral-200 flex items-start gap-2.5">
                      <span className="text-amber-400 mt-1">&bull;</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))
                ) : (
                  <p className="text-xs text-neutral-500 italic">No significant priority reversals identified.</p>
                )}
              </ul>
            </article>
          </div>

          {/* Middle Row: RECURRING THEMES & FREQUENTLY EXPLORED TOPICS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* RECURRING THEMES */}
            <article className="bg-[#0b0e15]/80 border border-white/[0.07] rounded-2xl p-6 space-y-3 shadow-sm">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono tracking-widest uppercase font-medium">
                <Compass className="w-4 h-4" />
                <span>RECURRING THEMES</span>
              </div>
              <ul className="space-y-2 pt-1">
                {insights.recurringThemes && insights.recurringThemes.length > 0 ? (
                  insights.recurringThemes.map((theme, idx) => (
                    <li key={idx} className="text-xs sm:text-sm text-neutral-200 flex items-start gap-2.5">
                      <span className="text-cyan-400 mt-1">&bull;</span>
                      <span className="leading-relaxed">{theme}</span>
                    </li>
                  ))
                ) : (
                  <p className="text-xs text-neutral-500 italic">Reflect regularly to highlight recurring themes.</p>
                )}
              </ul>
            </article>

            {/* FREQUENTLY EXPLORED TOPICS */}
            <article className="bg-[#0b0e15]/80 border border-white/[0.07] rounded-2xl p-6 space-y-3 shadow-sm">
              <div className="flex items-center gap-2 text-teal-400 text-xs font-mono tracking-widest uppercase font-medium">
                <Sparkles className="w-4 h-4" />
                <span>FREQUENTLY EXPLORED TOPICS</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {insights.frequentlyDiscussedTopics && insights.frequentlyDiscussedTopics.length > 0 ? (
                  insights.frequentlyDiscussedTopics.map((topic, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-neutral-300"
                    >
                      {topic}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-neutral-500 italic">Topics will populate as your archive grows.</p>
                )}
              </div>
            </article>
          </div>

          {/* UNRESOLVED QUESTIONS / PATTERNS */}
          <article className="bg-[#0b0e15]/80 border border-white/[0.07] rounded-2xl p-6 sm:p-7 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-purple-400 text-xs font-mono tracking-widest uppercase font-medium">
              <HelpCircle className="w-4 h-4" />
              <span>UNRESOLVED QUESTIONS & REPEATED CONCERNS</span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed font-normal">
              Questions or hesitations that persist across reflections without a recorded resolution:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {(insights.unresolvedPatterns && insights.unresolvedPatterns.length > 0
                ? insights.unresolvedPatterns
                : insights.repeatedConcerns || []
              ).map((concern, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs sm:text-sm text-neutral-200 leading-relaxed flex items-start gap-2"
                >
                  <span className="text-purple-400 mt-0.5 font-mono text-xs">?</span>
                  <span>{concern}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      )}
    </div>
  );
};
