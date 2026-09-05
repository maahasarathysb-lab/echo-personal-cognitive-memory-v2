import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  query,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../lib/firebase';
import { Decision } from '../types';
import {
  GitFork,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Trash2,
  X,
  Target,
  Brain,
  Lightbulb,
  Loader2,
} from 'lucide-react';

interface DecisionReplayViewProps {
  user: User;
}

export const DecisionReplayView: React.FC<DecisionReplayViewProps> = ({ user }) => {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

  // New Decision Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [confidenceScore, setConfidenceScore] = useState(7);
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [reasonsInput, setReasonsInput] = useState('');
  const [alternativesInput, setAlternativesInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Complete / Retrospective Modal State
  const [resolvingDecision, setResolvingDecision] = useState<Decision | null>(null);
  const [actualOutcome, setActualOutcome] = useState('');
  const [reflectionLesson, setReflectionLesson] = useState('');

  // AI Analysis State
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{
    decisionId: string;
    analysis: string;
    keyTakeaways: string[];
    model?: string;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'decisions'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: Decision[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          fetched.push({
            id: docSnap.id,
            title: data.title || 'Untitled Decision',
            description: data.description || '',
            date: data.date || new Date().toISOString(),
            reasons: Array.isArray(data.reasons) ? data.reasons : [],
            alternativesConsidered: Array.isArray(data.alternativesConsidered) ? data.alternativesConsidered : [],
            confidenceScore: typeof data.confidenceScore === 'number' ? data.confidenceScore : 5,
            expectedOutcome: data.expectedOutcome || '',
            actualOutcome: data.actualOutcome,
            reflectionLesson: data.reflectionLesson,
            status: data.status === 'completed' ? 'completed' : 'active',
            createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || data.updatedAt || new Date().toISOString(),
          });
        });

        // Sort by date descending
        fetched.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime());
        setDecisions(fetched);
        setLoading(false);
      },
      (err) => {
        console.error('Decisions snapshot error:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleCreateDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !expectedOutcome.trim()) return;

    try {
      setIsSubmitting(true);
      const newId = `dec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const docRef = doc(db, 'users', user.uid, 'decisions', newId);

      const reasonsArray = reasonsInput
        .split('\n')
        .map((r) => r.trim())
        .filter(Boolean);

      const alternativesArray = alternativesInput
        .split('\n')
        .map((a) => a.trim())
        .filter(Boolean);

      const payload = {
        id: newId,
        title: title.trim(),
        description: description.trim(),
        date: new Date().toISOString(),
        reasons: reasonsArray,
        alternativesConsidered: alternativesArray,
        confidenceScore: Number(confidenceScore),
        expectedOutcome: expectedOutcome.trim(),
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(docRef, sanitizeForFirestore(payload));

      setTitle('');
      setDescription('');
      setReasonsInput('');
      setAlternativesInput('');
      setConfidenceScore(7);
      setExpectedOutcome('');
      setIsCreateOpen(false);
    } catch (err) {
      console.error('Error creating decision:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingDecision) return;

    try {
      setIsSubmitting(true);
      const docRef = doc(db, 'users', user.uid, 'decisions', resolvingDecision.id);
      const payload = {
        ...resolvingDecision,
        actualOutcome: actualOutcome.trim(),
        reflectionLesson: reflectionLesson.trim(),
        status: 'completed',
        updatedAt: serverTimestamp(),
      };

      await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });

      setResolvingDecision(null);
      setActualOutcome('');
      setReflectionLesson('');
    } catch (err) {
      console.error('Error completing decision:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDecision = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'decisions', id));
      if (aiAnalysisResult?.decisionId === id) {
        setAiAnalysisResult(null);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleAnalyzeDecision = async (decision: Decision) => {
    try {
      setAnalyzingId(decision.id);
      setAiAnalysisResult(null);

      const token = await user.getIdToken();
      const res = await fetch('/api/gemini/analyze-decision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ decision }),
      });

      if (!res.ok) {
        throw new Error('Failed to analyze decision');
      }

      const data = await res.json();
      setAiAnalysisResult({
        decisionId: decision.id,
        analysis: data.analysis,
        keyTakeaways: data.keyTakeaways || [],
        model: data.model,
      });
    } catch (err) {
      console.error('Error analyzing decision:', err);
    } finally {
      setAnalyzingId(null);
    }
  };

  const activeDecisions = decisions.filter((d) => d.status === 'active');
  const completedDecisions = decisions.filter((d) => d.status === 'completed');
  const currentList = activeTab === 'active' ? activeDecisions : completedDecisions;

  return (
    <div id="decision-replay-view" className="max-w-4xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8 text-left">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono tracking-[0.25em] text-teal-400 uppercase font-medium">
            DECISIONS
          </span>
          <button
            id="open-create-decision-btn"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-mono transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Decision</span>
          </button>
        </div>

        <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-neutral-100">
          See what you chose, why you chose it, and what happened next.
        </h1>

        <p className="text-sm text-neutral-400 leading-relaxed max-w-2xl font-normal">
          A personal decision journal that tracks your assumptions, confidence level, and real-world outcomes to sharpen your judgment over time.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-2 pb-2 border-b border-white/[0.06]">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
            activeTab === 'active'
              ? 'bg-teal-500/10 text-teal-200 border border-teal-500/30'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Active Decisions ({activeDecisions.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer ${
            activeTab === 'completed'
              ? 'bg-teal-500/10 text-teal-200 border border-teal-500/30'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Reflected & Completed ({completedDecisions.length})
        </button>
      </div>

      {/* Decision Cards List */}
      {loading ? (
        <div className="py-14 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
        </div>
      ) : currentList.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
            <GitFork className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-medium text-neutral-200">
              {activeTab === 'active' ? 'No active decisions logged.' : 'No completed decisions yet.'}
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Capture your choice, rationale, and expected results before the outcome unfolds.
            </p>
          </div>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-mono tracking-wider transition cursor-pointer"
          >
            + Record First Decision
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {currentList.map((decision) => {
            const dateStr = new Date(decision.date).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const isAnalyzing = analyzingId === decision.id;
            const analysis = aiAnalysisResult?.decisionId === decision.id ? aiAnalysisResult : null;

            return (
              <article
                key={decision.id}
                className="bg-[#0b0e15]/80 border border-white/[0.07] rounded-2xl p-6 sm:p-7 space-y-5 shadow-[0_4px_25px_rgba(0,0,0,0.3)] text-left"
              >
                {/* Meta Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.05]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono tracking-widest text-teal-400 uppercase font-medium">
                      DECISION
                    </span>
                    <span className="text-neutral-600 font-mono text-xs">·</span>
                    <span className="text-[11px] font-mono text-neutral-400">{dateStr}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.07] text-[10px] font-mono text-neutral-300">
                      Confidence: {decision.confidenceScore}/10
                    </span>
                    <button
                      title="Delete decision"
                      onClick={(e) => handleDeleteDecision(decision.id, e)}
                      className="p-1 text-neutral-500 hover:text-rose-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title and Description */}
                <div>
                  <h3 className="text-lg sm:text-xl font-medium text-neutral-100 tracking-tight">
                    {decision.title}
                  </h3>
                  {decision.description && (
                    <p className="text-sm text-neutral-300 mt-1.5 leading-relaxed font-normal">
                      {decision.description}
                    </p>
                  )}
                </div>

                {/* Why I Chose This */}
                {decision.reasons && decision.reasons.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase font-medium">
                      Why I chose this:
                    </span>
                    <ul className="space-y-1">
                      {decision.reasons.map((reason, idx) => (
                        <li key={idx} className="text-xs text-neutral-300 flex items-start gap-2">
                          <span className="text-teal-400 mt-0.5">&bull;</span>
                          <span className="leading-relaxed">{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Expected Outcome */}
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1">
                  <span className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase font-medium">
                    Expected Outcome:
                  </span>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {decision.expectedOutcome}
                  </p>
                </div>

                {/* Actual Outcome & Lesson (if completed) */}
                {decision.status === 'completed' && (
                  <div className="space-y-3 pt-2">
                    {decision.actualOutcome && (
                      <div className="p-3.5 rounded-xl bg-teal-950/20 border border-teal-500/25 space-y-1">
                        <span className="text-[10px] font-mono tracking-wider text-teal-300 uppercase font-medium">
                          Actual Outcome:
                        </span>
                        <p className="text-xs text-neutral-200 leading-relaxed">
                          {decision.actualOutcome}
                        </p>
                      </div>
                    )}

                    {decision.reflectionLesson && (
                      <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1">
                        <span className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase font-medium">
                          What I Learned:
                        </span>
                        <p className="text-xs text-neutral-300 leading-relaxed">
                          {decision.reflectionLesson}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Bar */}
                <div className="pt-3 border-t border-white/[0.05] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {decision.status === 'active' && (
                      <button
                        onClick={() => {
                          setResolvingDecision(decision);
                          setActualOutcome('');
                          setReflectionLesson('');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-mono tracking-wider flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Resolve Outcome</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleAnalyzeDecision(decision)}
                      disabled={isAnalyzing}
                      className="px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-neutral-300 border border-white/[0.08] text-xs font-mono tracking-wider flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                      )}
                      <span>{isAnalyzing ? 'Analyzing...' : 'AI Retrospective'}</span>
                    </button>
                  </div>
                </div>

                {/* AI Retrospective Result (Premium Analysis Card) */}
                {analysis && (
                  <div className="mt-4 p-5 rounded-2xl bg-[#090d14] border border-teal-500/30 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                      <div className="flex items-center gap-2 text-teal-300 text-xs font-mono uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                        <span>Cognitive Decision Retrospective</span>
                      </div>
                      <button
                        onClick={() => setAiAnalysisResult(null)}
                        className="p-1 text-neutral-400 hover:text-white rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs sm:text-sm text-neutral-200 leading-relaxed whitespace-pre-line font-normal">
                      {analysis.analysis}
                    </p>

                    {analysis.keyTakeaways && analysis.keyTakeaways.length > 0 && (
                      <div className="pt-2 space-y-1.5">
                        <span className="text-[10px] font-mono tracking-wider text-teal-400 uppercase">
                          Key Takeaways:
                        </span>
                        <ul className="space-y-1">
                          {analysis.keyTakeaways.map((takeaway, idx) => (
                            <li key={idx} className="text-xs text-neutral-300 flex items-start gap-2">
                              <span className="text-teal-400 mt-0.5">&bull;</span>
                              <span className="leading-relaxed">{takeaway}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Modal: Record Decision */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b0e15] border border-white/[0.1] rounded-2xl p-6 sm:p-7 max-w-lg w-full space-y-5 shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-medium text-neutral-100">Record a New Decision</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 text-neutral-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDecision} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase">
                  Decision Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Transition from full-time role to lead architect"
                  className="w-full bg-[#07090e] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-teal-500/40"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase">
                  Context & Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is the context prompting this decision?"
                  className="w-full bg-[#07090e] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-teal-500/40 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase">
                  Why I chose this (Reasons, 1 per line)
                </label>
                <textarea
                  rows={2}
                  value={reasonsInput}
                  onChange={(e) => setReasonsInput(e.target.value)}
                  placeholder="Allows deeper technical ownership&#10;Better work-life balance"
                  className="w-full bg-[#07090e] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-teal-500/40 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase">
                  Confidence Level: {confidenceScore} / 10
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={confidenceScore}
                  onChange={(e) => setConfidenceScore(Number(e.target.value))}
                  className="w-full accent-teal-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase">
                  Expected Outcome *
                </label>
                <textarea
                  rows={2}
                  required
                  value={expectedOutcome}
                  onChange={(e) => setExpectedOutcome(e.target.value)}
                  placeholder="What specifically do you anticipate happening over the next 3-6 months?"
                  className="w-full bg-[#07090e] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-teal-500/40 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim() || !expectedOutcome.trim()}
                  className="px-4 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-mono tracking-wider transition cursor-pointer disabled:opacity-40"
                >
                  {isSubmitting ? 'Recording...' : 'Save Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Resolve Decision Outcome */}
      {resolvingDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0b0e15] border border-white/[0.1] rounded-2xl p-6 sm:p-7 max-w-lg w-full space-y-5 shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-base font-medium text-neutral-100">Record Lived Outcome</h3>
                <p className="text-xs text-neutral-400 mt-0.5">{resolvingDecision.title}</p>
              </div>
              <button
                onClick={() => setResolvingDecision(null)}
                className="p-1 text-neutral-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCompleteDecision} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase">
                  Actual Outcome *
                </label>
                <textarea
                  rows={3}
                  required
                  value={actualOutcome}
                  onChange={(e) => setActualOutcome(e.target.value)}
                  placeholder="What actually took place? How did it align with your expectations?"
                  className="w-full bg-[#07090e] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-teal-500/40 resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono tracking-wider text-neutral-400 uppercase">
                  What I Learned / Takeaways
                </label>
                <textarea
                  rows={2}
                  value={reflectionLesson}
                  onChange={(e) => setReflectionLesson(e.target.value)}
                  placeholder="What assumption was confirmed or broken? What will you do differently next time?"
                  className="w-full bg-[#07090e] border border-white/[0.08] rounded-xl px-3.5 py-2 text-xs text-neutral-200 focus:outline-none focus:border-teal-500/40 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setResolvingDecision(null)}
                  className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !actualOutcome.trim()}
                  className="px-4 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-mono tracking-wider transition cursor-pointer disabled:opacity-40"
                >
                  {isSubmitting ? 'Saving...' : 'Mark as Completed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
