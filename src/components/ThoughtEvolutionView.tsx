import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { Interaction, ThoughtEvolutionResponse } from '../types';
import {
  TrendingUp,
  Sparkles,
  Search,
  AlertCircle,
  Tag,
  Loader2,
  CheckCircle2,
  Compass,
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
  'Productivity & Balance',
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
    <div id="thought-evolution-view" className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8 text-left">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono tracking-[0.25em] text-teal-400 uppercase font-medium">
            THOUGHT EVOLUTION
          </span>
          <span className="text-[10px] font-mono text-neutral-500">
            {interactions.length} reflections indexed
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-neutral-100">
          Watch your thinking change over time.
        </h1>

        <p className="text-sm text-neutral-400 leading-relaxed max-w-2xl font-normal">
          The starter app remembers what you said. ECHO maps how your thinking, assumptions, and values mature over time across recurring topics in your life.
        </p>
      </header>

      {/* Topic Exploration Selector */}
      <section className="bg-[#0b0e15]/90 border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-4 shadow-[0_15px_35px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-[10px] tracking-wider text-neutral-400 uppercase flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-teal-400" />
            <span>Select a Topic to Trace:</span>
          </span>
          <span className="text-[10px] font-mono text-neutral-500">
            Active topic: {selectedTopic}
          </span>
        </div>

        {/* Preset Topic Chips */}
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
                className={`text-xs font-mono px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-teal-500/15 text-teal-300 border border-teal-500/35 font-medium shadow-[0_0_12px_rgba(45,212,191,0.15)]'
                    : 'bg-white/[0.02] text-neutral-400 hover:text-neutral-200 border border-white/[0.06] hover:border-white/[0.12]'
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
          className="flex gap-2 pt-3 border-t border-white/[0.06]"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="custom-topic-input"
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="Or enter any custom topic (e.g., 'Creative projects', 'Self-discipline', 'Leadership')..."
              className="w-full bg-[#07090e] border border-white/[0.08] rounded-xl pl-9 pr-3.5 py-2 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-teal-500/40"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !customTopic.trim()}
            className="px-4 py-2 bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-mono rounded-xl transition-all cursor-pointer disabled:opacity-40 flex items-center gap-1.5 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Trace Evolution</span>
          </button>
        </form>
      </section>

      {/* Visual Temporal Axis: PAST ───── NOW ───── FUTURE */}
      <div className="w-full py-4 flex items-center justify-between text-[10px] font-mono tracking-[0.24em] text-neutral-500 px-4">
        <span className="text-neutral-400 font-medium">PAST</span>
        <div className="flex-1 mx-6 flex items-center justify-between relative">
          <div className="absolute inset-0 top-1/2 -translate-y-1/2 h-[1px] bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 z-10" />
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500/50 z-10" />
          <div className="z-10 flex items-center gap-1 px-3 py-0.5 rounded-full bg-teal-950/60 border border-teal-500/40 text-teal-300 text-[9px] tracking-widest">
            <span className="w-1 h-1 rounded-full bg-teal-400 animate-ping" />
            <span>NOW</span>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500/50 z-10" />
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 z-10" />
        </div>
        <span className="text-neutral-400 font-medium">FUTURE</span>
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
        <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-7 h-7 text-teal-400 animate-spin" />
          <p className="text-xs text-neutral-300 font-mono tracking-wide">
            Traversing your historical reflections on &ldquo;{selectedTopic}&rdquo;...
          </p>
        </div>
      )}

      {/* Evolution Results */}
      {!loading && evolutionData && (
        <div className="space-y-8 animate-fadeIn">
          {!evolutionData.hasEnoughMemories ? (
            <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center space-y-3">
              <Compass className="w-8 h-8 text-amber-400/80 mx-auto" />
              <h3 className="text-sm font-medium text-neutral-200">
                Insufficient Memories for &ldquo;{evolutionData.topic}&rdquo;
              </h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
                {evolutionData.evolutionSynthesis}
              </p>
              <p className="text-[11px] text-neutral-500 font-mono pt-1">
                Tip: As you write reflections relating to this topic, ECHO will automatically connect the dots and display your trajectory here.
              </p>
            </div>
          ) : (
            <>
              {/* Trajectory Overview Synthesis */}
              <article className="p-6 sm:p-8 rounded-2xl bg-[#0b0e15]/80 border border-teal-500/25 space-y-3 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
                <div className="flex items-center gap-2 text-teal-400 text-xs font-mono tracking-[0.2em] uppercase">
                  <Sparkles className="w-4 h-4 text-teal-300" />
                  <span>COGNITIVE TRAJECTORY: {evolutionData.topic}</span>
                </div>
                <p className="text-sm sm:text-base text-neutral-200 leading-relaxed font-normal whitespace-pre-line">
                  {evolutionData.evolutionSynthesis}
                </p>
              </article>

              {/* PIVOTAL MOMENTS & PERSISTENT THEMES */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PIVOTAL MOMENTS */}
                <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-mono tracking-widest uppercase font-medium">
                    <TrendingUp className="w-4 h-4" />
                    <span>PIVOTAL MOMENTS</span>
                  </div>
                  {evolutionData.inflectionPoints && evolutionData.inflectionPoints.length > 0 ? (
                    <ul className="space-y-2">
                      {evolutionData.inflectionPoints.map((point, idx) => (
                        <li key={idx} className="text-xs text-neutral-300 flex items-start gap-2">
                          <span className="text-amber-400 font-mono text-[11px] mt-0.5">0{idx + 1}.</span>
                          <span className="leading-relaxed">{point}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-neutral-500 italic">No sudden inflection points detected yet.</p>
                  )}
                </div>

                {/* PERSISTENT THEMES */}
                <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-3">
                  <div className="flex items-center gap-2 text-teal-400 text-xs font-mono tracking-widest uppercase font-medium">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>PERSISTENT THEMES</span>
                  </div>
                  {evolutionData.recurringThemes && evolutionData.recurringThemes.length > 0 ? (
                    <ul className="space-y-2">
                      {evolutionData.recurringThemes.map((theme, idx) => (
                        <li key={idx} className="text-xs text-neutral-300 flex items-start gap-2">
                          <span className="text-teal-400 font-mono text-[11px] mt-0.5">&bull;</span>
                          <span className="leading-relaxed">{theme}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-neutral-500 italic">Core themes are continuing to emerge.</p>
                  )}
                </div>
              </div>

              {/* Chronological Reflection Timeline */}
              {evolutionData.timeline && evolutionData.timeline.length > 0 && (
                <section className="space-y-4 pt-2">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
                    <span className="text-[10px] font-mono tracking-[0.25em] text-neutral-400 uppercase font-medium">
                      CHRONOLOGICAL TIMELINE
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500">
                      {evolutionData.timeline.length} milestone reflections
                    </span>
                  </div>

                  <div className="relative pl-6 sm:pl-8 space-y-6">
                    <div className="absolute left-[11px] sm:left-[15px] top-4 bottom-4 w-[1px] bg-gradient-to-b from-teal-500/40 via-teal-500/20 to-transparent" />

                    {evolutionData.timeline.map((stage, idx) => (
                      <div key={idx} className="relative group">
                        <div className="absolute -left-[27px] sm:-left-[31px] top-5 flex items-center justify-center">
                          <span className="w-2.5 h-2.5 rounded-full bg-teal-400 ring-4 ring-[#07090e] shadow-[0_0_8px_rgba(45,212,191,0.6)]" />
                        </div>

                        <div className="bg-[#0b0e15]/80 border border-white/[0.07] rounded-2xl p-5 space-y-2 shadow-sm text-left">
                          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                            <span className="text-teal-400 font-medium">STAGE {idx + 1}</span>
                            <span>{stage.date}</span>
                          </div>

                          <h4 className="text-sm font-medium text-neutral-100">
                            {stage.reflectionTitle}
                          </h4>

                          <p className="text-xs text-neutral-400 leading-relaxed italic">
                            &ldquo;{stage.thoughtExcerpt}&rdquo;
                          </p>

                          <div className="mt-2 pt-2 border-t border-white/[0.04] text-xs text-teal-300/90 font-mono">
                            Shift: {stage.shiftSummary}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
