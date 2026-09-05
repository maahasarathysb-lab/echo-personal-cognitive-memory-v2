import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Interaction, ThoughtEvolutionResponse } from '../types';
import {
  TrendingUp,
  Sparkles,
  Search,
  Calendar,
  AlertCircle,
  Tag,
  ArrowRight,
  GitCommit,
  CheckCircle2,
} from 'lucide-react';

interface ThoughtEvolutionViewProps {
  user: User;
  interactions: Interaction[];
}

const PRESET_TOPICS = [
  'Career & Ambition',
  'Learning & Skills',
  'Relationships',
  'Goals & Direction',
  'Confidence & Doubt',
  'Productivity & Burnout',
];

export const ThoughtEvolutionView: React.FC<ThoughtEvolutionViewProps> = ({
  user,
  interactions,
}) => {
  const [selectedTopic, setSelectedTopic] = useState<string>('Career & Ambition');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [evolutionData, setEvolutionData] = useState<ThoughtEvolutionResponse | null>(null);

  const handleAnalyzeEvolution = async (topicToAnalyze: string) => {
    const cleanTopic = topicToAnalyze.trim();
    if (!cleanTopic) return;

    try {
      setLoading(true);
      setError(null);

      const token = await user.getIdToken();
      const res = await fetch('/api/gemini/thought-evolution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          topic: cleanTopic,
          clientMemories: interactions,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to analyze thought evolution');
      }

      const data: ThoughtEvolutionResponse = await res.json();
      setEvolutionData(data);
    } catch (err) {
      console.error('Thought evolution error:', err);
      setError('Unable to analyze your thought trajectory right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="thought-evolution-container" className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="border-b border-[#1c202d] pb-6">
        <div className="flex items-center gap-2 text-teal-400 text-xs uppercase tracking-wider font-semibold mb-1">
          <TrendingUp className="w-3.5 h-3.5" /> Longitudinal Cognitive Mapping
        </div>
        <h1 className="text-2xl font-semibold text-white tracking-tight">Thought Evolution</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
          The starter app remembers what you said. ECHO maps how your thinking, assumptions, and values mature over time across recurring topics in your life.
        </p>
      </div>

      {/* Topic Selector & Custom Search */}
      <div className="bg-[#11141e] border border-[#1e2332] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-teal-400" />
            <span>Select a Topic to Map:</span>
          </span>
          <span className="text-[11px] text-slate-500">
            {interactions.length} total reflection{interactions.length === 1 ? '' : 's'} available
          </span>
        </div>

        {/* Preset Chips */}
        <div className="flex flex-wrap gap-2">
          {PRESET_TOPICS.map((topic) => {
            const isSelected = selectedTopic === topic && !customTopic;
            return (
              <button
                key={topic}
                id={`evolution-chip-${topic.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                onClick={() => {
                  setSelectedTopic(topic);
                  setCustomTopic('');
                  handleAnalyzeEvolution(topic);
                }}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-medium'
                    : 'bg-[#0d1017] text-slate-400 hover:text-slate-200 border border-[#1f2536]'
                }`}
              >
                {topic}
              </button>
            );
          })}
        </div>

        {/* Custom Topic Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (customTopic.trim()) {
              setSelectedTopic(customTopic.trim());
              handleAnalyzeEvolution(customTopic.trim());
            }
          }}
          className="flex gap-2 pt-2 border-t border-[#171b26]"
        >
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="custom-topic-input"
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="Or enter any custom topic (e.g., 'Starting a company', 'Public speaking', 'Focus')..."
              className="w-full bg-[#0d1017] border border-[#202534] rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !customTopic.trim()}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-[#0a0f16] text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 shrink-0 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Trace Evolution</span>
          </button>
        </form>
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
        <div className="bg-[#11141e] border border-[#1e2332] rounded-xl p-12 text-center space-y-3">
          <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-300 font-medium">
            Traversing your historical memories on &ldquo;{selectedTopic}&rdquo;...
          </p>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
            ECHO is scoring relevant reflections, organizing chronological inflection points, and synthesizing how your mindset matured.
          </p>
        </div>
      )}

      {/* Result Display */}
      {!loading && evolutionData && (
        <div className="space-y-6">
          {/* Zero-Relevance Guard Display */}
          {!evolutionData.hasEnoughMemories ? (
            <div className="bg-[#11141e] border border-[#1e2332] rounded-xl p-8 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-500/80 mx-auto" />
              <h3 className="text-sm font-medium text-slate-200">
                Insufficient Memories for &ldquo;{evolutionData.topic}&rdquo;
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                {evolutionData.evolutionSynthesis}
              </p>
              <p className="text-[11px] text-slate-500 pt-2">
                Tip: As you write reflections that mention or relate to this theme, ECHO will automatically connect the dots and display your timeline here.
              </p>
            </div>
          ) : (
            <>
              {/* Evolution Synthesis Banner */}
              <div className="bg-[#0f131d] border border-teal-500/30 rounded-xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>ECHO Trajectory Synthesis: {evolutionData.topic}</span>
                  </div>
                  {evolutionData.model && (
                    <span className="text-[10px] font-mono text-slate-500 lowercase bg-[#141926] px-2 py-0.5 rounded border border-[#21283c]">
                      {evolutionData.model}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                  {evolutionData.evolutionSynthesis}
                </p>
              </div>

              {/* Inflection Points & Themes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Inflection Points */}
                <div className="bg-[#11141e] border border-[#1e2332] rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                    <GitCommit className="w-3.5 h-3.5" />
                    <span>Pivotal Inflection Points</span>
                  </div>
                  {evolutionData.inflectionPoints.length > 0 ? (
                    <ul className="space-y-2">
                      {evolutionData.inflectionPoints.map((point, idx) => (
                        <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                          <span className="text-amber-400 font-mono text-[11px] mt-0.5">0{idx + 1}.</span>
                          <span className="leading-relaxed">{point}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No major sudden shifts detected.</p>
                  )}
                </div>

                {/* Recurring Themes */}
                <div className="bg-[#11141e] border border-[#1e2332] rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Persistent Core Themes</span>
                  </div>
                  {evolutionData.recurringThemes.length > 0 ? (
                    <ul className="space-y-2">
                      {evolutionData.recurringThemes.map((theme, idx) => (
                        <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                          <span className="text-teal-400 font-mono text-[11px] mt-0.5">&bull;</span>
                          <span className="leading-relaxed">{theme}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500 italic">Themes are still forming.</p>
                  )}
                </div>
              </div>

              {/* Chronological Timeline */}
              <div className="bg-[#11141e] border border-[#1e2332] rounded-xl p-6 space-y-6">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-400" />
                  <span>Chronological Journey</span>
                </h3>

                <div className="relative pl-6 space-y-6 border-l-2 border-[#1c2233]">
                  {evolutionData.timeline.map((stage, idx) => (
                    <div key={idx} className="relative group">
                      {/* Timeline dot */}
                      <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-[#11141e] border-2 border-teal-400 group-hover:scale-110 transition-transform" />

                      <div className="bg-[#0b0e16] border border-[#1c2232] rounded-lg p-4 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-white">
                            {stage.reflectionTitle}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500">
                            {stage.date}
                          </span>
                        </div>

                        {stage.thoughtExcerpt && (
                          <blockquote className="text-xs text-slate-400 italic bg-[#080a10] p-2.5 rounded border border-[#161a26]">
                            &ldquo;{stage.thoughtExcerpt}&rdquo;
                          </blockquote>
                        )}

                        <div className="flex items-start gap-2 text-xs text-teal-300 pt-1">
                          <ArrowRight className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                          <span>{stage.shiftSummary}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Initial state when no query run yet */}
      {!loading && !evolutionData && (
        <div className="bg-[#11141e] border border-[#1e2332] rounded-xl p-12 text-center space-y-3">
          <TrendingUp className="w-8 h-8 text-slate-600 mx-auto" />
          <h3 className="text-sm font-medium text-slate-300">
            Ready to analyze your thought trajectory
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Choose a topic above or type a custom inquiry to see how your thinking has evolved across time.
          </p>
          <button
            onClick={() => handleAnalyzeEvolution(selectedTopic)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 text-[#0a0f16] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Analyze &ldquo;{selectedTopic}&rdquo;</span>
          </button>
        </div>
      )}
    </div>
  );
};
