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
  BookOpen,
  Calendar,
  HelpCircle,
  Layers,
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
    <div id="echo-insights-container" className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1c202d] pb-6">
        <div>
          <div className="flex items-center gap-2 text-teal-400 text-xs uppercase tracking-wider font-semibold mb-1">
            <Lightbulb className="w-3.5 h-3.5" /> Grounded Cognitive Dashboard
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">ECHO Insights</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Patterns, priority shifts, and enduring themes synthesized strictly from your private reflection archives.
          </p>
        </div>

        <button
          id="refresh-insights-btn"
          onClick={fetchInsights}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#141824] hover:bg-[#1a2030] border border-[#232a3d] text-slate-200 text-xs font-medium transition-colors cursor-pointer shrink-0 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Synthesizing...' : 'Refresh Insights'}</span>
        </button>
      </div>

      {/* Non-medical Disclaimer Banner */}
      <div className="bg-[#0e121b] border border-[#1d2436] rounded-xl p-4 flex items-start gap-3 text-xs text-slate-400">
        <Shield className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="text-slate-300 font-medium">Cognitive Self-Reflection Notice:</span>
          <p className="text-[11px] leading-relaxed text-slate-400">
            ECHO analyzes cognitive patterns for personal growth and reflective clarity. Insights are strictly derived from your recorded writings and do not constitute clinical, psychiatric, or psychological diagnoses.
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="py-20 text-center space-y-3">
          <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-300">Synthesizing cognitive patterns across your memories...</p>
        </div>
      )}

      {/* Insights Content */}
      {!loading && insights && (
        <div className="space-y-6">
          {/* Top 3 High-Impact Insight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Positive Progress */}
            <div className="bg-[#11141e] border border-[#1e2332] rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Positive Progress & Milestones</span>
              </div>
              <ul className="space-y-2">
                {insights.positiveProgress.map((item, idx) => (
                  <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                    <span className="text-teal-400 mt-0.5">&bull;</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Shifting Priorities */}
            <div className="bg-[#11141e] border border-[#1e2332] rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Shifts in Priorities</span>
              </div>
              <ul className="space-y-2">
                {insights.changesInPriorities.length > 0 ? (
                  insights.changesInPriorities.map((item, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-indigo-400 mt-0.5">&bull;</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-slate-500 italic">
                    Keep logging to detect priority shifts over time.
                  </li>
                )}
              </ul>
            </div>

            {/* Unresolved Inquiries */}
            <div className="bg-[#11141e] border border-[#1e2332] rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Unresolved Inquiries & Patterns</span>
              </div>
              <ul className="space-y-2">
                {insights.unresolvedPatterns.length > 0 ? (
                  insights.unresolvedPatterns.map((item, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">&bull;</span>
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-slate-500 italic">No recurring dilemmas observed.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Secondary Patterns: Recurring Themes & Repeated Concerns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recurring Cognitive Themes */}
            <div className="bg-[#11141e] border border-[#1e2332] rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold uppercase tracking-wider">
                <Layers className="w-3.5 h-3.5 text-teal-400" />
                <span>Recurring Cognitive Themes</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {insights.recurringThemes.map((theme, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-[#0b0e15] border border-[#1d2334] text-slate-300 px-3 py-1.5 rounded-lg"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>

            {/* Frequently Discussed Topics */}
            <div className="bg-[#11141e] border border-[#1e2332] rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>Frequently Explored Topics</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {insights.frequentlyDiscussedTopics.map((topic, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-[#0b0e15] border border-[#1d2334] text-slate-300 px-3 py-1.5 rounded-lg"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Supporting Evidence from Memory */}
          {insights.supportingMemories && insights.supportingMemories.length > 0 && (
            <div className="bg-[#11141e] border border-[#1e2332] rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Supporting Reflections Identified by ECHO</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {insights.supportingMemories.map((mem, idx) => (
                  <div
                    key={idx}
                    className="bg-[#0b0e16] border border-[#1b202e] rounded-lg p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                      <span className="text-slate-300 font-sans font-medium line-clamp-1">
                        {mem.reflectionTitle}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Calendar className="w-3 h-3" />
                        {mem.date}
                      </span>
                    </div>
                    <blockquote className="text-xs text-slate-400 italic leading-relaxed line-clamp-2">
                      &ldquo;{mem.excerpt}&rdquo;
                    </blockquote>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
