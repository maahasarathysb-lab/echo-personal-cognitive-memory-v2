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
  Scale,
  Brain,
  Lightbulb,
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

  // Firestore real-time listener for user's isolated decisions
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

      // Reset form
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
    if (!confirm('Are you sure you want to remove this decision record?')) return;
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
      console.error('Analysis error:', err);
    } finally {
      setAnalyzingId(null);
    }
  };

  const activeDecisions = decisions.filter((d) => d.status === 'active');
  const completedDecisions = decisions.filter((d) => d.status === 'completed');
  const displayedDecisions = activeTab === 'active' ? activeDecisions : completedDecisions;

  return (
    <div id="decision-replay-container" className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1c202d] pb-6">
        <div>
          <div className="flex items-center gap-2 text-teal-400 text-xs uppercase tracking-wider font-semibold mb-1">
            <GitFork className="w-3.5 h-3.5" /> Decision Replay & Cognitive Accountability
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Decisions</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
            Record what you decided, your confidence score, and expected outcome. When the outcome arrives, replay the decision to identify blind spots and capture enduring lessons.
          </p>
        </div>
        <button
          id="new-decision-btn"
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-[#0a0f16] text-xs font-semibold shadow-sm transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Record Decision</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1c202d] pb-2">
        <button
          id="tab-active-decisions"
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'active'
              ? 'bg-[#181c28] text-white border border-[#272d3f]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>Active In-Flight ({activeDecisions.length})</span>
        </button>
        <button
          id="tab-completed-decisions"
          onClick={() => setActiveTab('completed')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            activeTab === 'completed'
              ? 'bg-[#181c28] text-white border border-[#272d3f]'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
          <span>Completed & Replayed ({completedDecisions.length})</span>
        </button>
      </div>

      {/* Decision Cards List */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading decisions...</span>
        </div>
      ) : displayedDecisions.length === 0 ? (
        <div id="decisions-empty-state" className="bg-[#11141e] border border-[#1d2230] rounded-xl p-12 text-center">
          <GitFork className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-slate-300 mb-1">
            {activeTab === 'active' ? 'No active decisions' : 'No replayed decisions yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
            {activeTab === 'active'
              ? 'Log an important choice you made recently along with your initial confidence and expected result.'
              : 'When an active decision resolves, mark it complete to record the actual outcome and reflect with ECHO.'}
          </p>
          {activeTab === 'active' && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Log Decision Now</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {displayedDecisions.map((item) => {
            const dateStr = new Date(item.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            const isAnalyzing = analyzingId === item.id;
            const hasAnalysis = aiAnalysisResult?.decisionId === item.id;

            return (
              <div
                key={item.id}
                id={`decision-card-${item.id}`}
                className="bg-[#11141e] border border-[#1e2332] rounded-xl p-6 transition-all duration-150 space-y-4"
              >
                {/* Top Row: Title, Date, Confidence Badge */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                          item.status === 'completed'
                            ? 'bg-teal-500/10 text-teal-300 border border-teal-500/20'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        }`}
                      >
                        {item.status}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">{dateStr}</span>
                    </div>
                    <h3 className="text-base font-semibold text-white tracking-tight">{item.title}</h3>
                    {item.description && (
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                    )}
                  </div>

                  {/* Confidence Pill & Delete */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 bg-[#0d1017] border border-[#1f2537] px-3 py-1.5 rounded-lg">
                      <span className="text-[11px] text-slate-400">Confidence:</span>
                      <span className="text-xs font-bold text-teal-400 font-mono">
                        {item.confidenceScore}/10
                      </span>
                    </div>
                    <button
                      title="Delete decision"
                      onClick={(e) => handleDeleteDecision(item.id, e)}
                      className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Core Decision Attributes Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {/* Reasons & Logic */}
                  <div className="bg-[#0b0d14] border border-[#191d29] rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
                      <Scale className="w-3.5 h-3.5 text-teal-400" />
                      <span>Reasons & Factors:</span>
                    </div>
                    {item.reasons.length > 0 ? (
                      <ul className="space-y-1 text-xs text-slate-400 list-disc list-inside">
                        {item.reasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No specific reasons listed.</p>
                    )}
                  </div>

                  {/* Alternatives Considered */}
                  <div className="bg-[#0b0d14] border border-[#191d29] rounded-lg p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
                      <Brain className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Alternatives Considered:</span>
                    </div>
                    {item.alternativesConsidered.length > 0 ? (
                      <ul className="space-y-1 text-xs text-slate-400 list-disc list-inside">
                        {item.alternativesConsidered.map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No alternatives recorded.</p>
                    )}
                  </div>
                </div>

                {/* Expected vs Actual Outcome Comparison */}
                <div className="bg-[#0e111a] border border-[#1e2332] rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-1 text-[11px] font-medium text-slate-300 mb-1">
                        <Target className="w-3.5 h-3.5 text-amber-400" />
                        <span>Expected Outcome:</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed bg-[#0a0c12] p-2.5 rounded border border-[#171b26]">
                        {item.expectedOutcome}
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center gap-1 text-[11px] font-medium text-slate-300 mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                        <span>Actual Outcome:</span>
                      </div>
                      {item.actualOutcome ? (
                        <p className="text-xs text-teal-200 leading-relaxed bg-[#0a0c12] p-2.5 rounded border border-teal-950/40">
                          {item.actualOutcome}
                        </p>
                      ) : (
                        <div className="flex items-center justify-between p-2.5 rounded bg-[#0a0c12] border border-dashed border-[#23293a]">
                          <span className="text-xs text-slate-500 italic">Outcome pending...</span>
                          <button
                            onClick={() => {
                              setResolvingDecision(item);
                              setActualOutcome('');
                              setReflectionLesson('');
                            }}
                            className="text-xs text-teal-400 hover:text-teal-300 font-medium cursor-pointer"
                          >
                            Resolve Outcome &rarr;
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {item.reflectionLesson && (
                    <div className="pt-2 border-t border-[#1a1f2c]">
                      <div className="flex items-center gap-1.5 text-[11px] font-medium text-amber-300/90 mb-1">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                        <span>Reflection & Lesson Learned:</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed italic bg-[#0a0c12] p-2.5 rounded border border-[#1a1e2b]">
                        &ldquo;{item.reflectionLesson}&rdquo;
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2">
                    {item.status === 'active' && (
                      <button
                        onClick={() => {
                          setResolvingDecision(item);
                          setActualOutcome('');
                          setReflectionLesson('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Record Outcome & Replay</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleAnalyzeDecision(item)}
                      disabled={isAnalyzing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181c28] hover:bg-[#202535] border border-[#272e42] text-slate-300 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                      <span>{isAnalyzing ? 'Analyzing with ECHO...' : 'AI Decision Retrospective'}</span>
                    </button>
                  </div>
                </div>

                {/* AI Analysis Drawer */}
                {hasAnalysis && (
                  <div className="mt-4 bg-[#0a0c13] border border-teal-500/30 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>ECHO Decision Analysis</span>
                        {aiAnalysisResult.model && (
                          <span className="text-[10px] font-mono text-slate-500 lowercase bg-[#131722] px-1.5 py-0.5 rounded border border-[#1f2536]">
                            {aiAnalysisResult.model}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setAiAnalysisResult(null)}
                        className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                      {aiAnalysisResult.analysis}
                    </p>

                    {aiAnalysisResult.keyTakeaways.length > 0 && (
                      <div className="pt-2 border-t border-[#171b26] space-y-1.5">
                        <span className="text-[11px] font-medium text-teal-300">Key Cognitive Takeaways:</span>
                        <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                          {aiAnalysisResult.keyTakeaways.map((t, i) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Decision Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-[#000000]/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#11141e] border border-[#222738] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1c202d] pb-3">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <GitFork className="w-4 h-4 text-teal-400" />
                <span>Record a New Decision</span>
              </h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDecision} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Decision Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Decided to switch tech stack for project X"
                  className="w-full bg-[#0d1017] border border-[#202534] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Context / Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is the background behind making this choice right now?"
                  className="w-full bg-[#0d1017] border border-[#202534] rounded-lg p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 resize-none"
                />
              </div>

              {/* Confidence Meter Slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Initial Confidence: <span className="text-teal-400 font-bold font-mono">{confidenceScore}/10</span>
                  </label>
                  <span className="text-[10px] text-slate-500">How certain do you feel about this decision?</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={confidenceScore}
                  onChange={(e) => setConfidenceScore(Number(e.target.value))}
                  className="w-full accent-teal-400 cursor-pointer"
                />
              </div>

              {/* Expected Outcome */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Expected Outcome *
                </label>
                <textarea
                  required
                  rows={2}
                  value={expectedOutcome}
                  onChange={(e) => setExpectedOutcome(e.target.value)}
                  placeholder="What specific outcome or metric do you expect this choice to achieve?"
                  className="w-full bg-[#0d1017] border border-[#202534] rounded-lg p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 resize-none"
                />
              </div>

              {/* Reasons */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Key Reasons / Supporting Factors (one per line)
                </label>
                <textarea
                  rows={2}
                  value={reasonsInput}
                  onChange={(e) => setReasonsInput(e.target.value)}
                  placeholder="1. Faster load times&#10;2. Better maintainability"
                  className="w-full bg-[#0d1017] border border-[#202534] rounded-lg p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 resize-none"
                />
              </div>

              {/* Alternatives Considered */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Alternatives Considered (one per line)
                </label>
                <textarea
                  rows={2}
                  value={alternativesInput}
                  onChange={(e) => setAlternativesInput(e.target.value)}
                  placeholder="1. Keep current solution&#10;2. Delegate to third-party vendor"
                  className="w-full bg-[#0d1017] border border-[#202534] rounded-lg p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1c202d]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-[#0a0f16] text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Decision...' : 'Save Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete / Retrospective Modal */}
      {resolvingDecision && (
        <div className="fixed inset-0 bg-[#000000]/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#11141e] border border-[#222738] rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1c202d] pb-3">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>Replay & Record Outcome</span>
              </h2>
              <button
                onClick={() => setResolvingDecision(null)}
                className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#0d1017] p-3 rounded-lg border border-[#1b202d]">
              <span className="text-[10px] uppercase font-mono text-teal-400">Decision:</span>
              <p className="text-xs font-medium text-white">{resolvingDecision.title}</p>
              <span className="text-[10px] uppercase font-mono text-slate-500 mt-2 block">Expected Outcome:</span>
              <p className="text-xs text-slate-400">{resolvingDecision.expectedOutcome}</p>
            </div>

            <form onSubmit={handleCompleteDecision} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  What actually happened? (Actual Outcome) *
                </label>
                <textarea
                  required
                  rows={3}
                  value={actualOutcome}
                  onChange={(e) => setActualOutcome(e.target.value)}
                  placeholder="Describe how reality played out compared to what you expected..."
                  className="w-full bg-[#0d1017] border border-[#202534] rounded-lg p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Cognitive Lesson / What would you do differently?
                </label>
                <textarea
                  rows={2}
                  value={reflectionLesson}
                  onChange={(e) => setReflectionLesson(e.target.value)}
                  placeholder="e.g. Underestimated deployment friction; overweighted initial optimism."
                  className="w-full bg-[#0d1017] border border-[#202534] rounded-lg p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1c202d]">
                <button
                  type="button"
                  onClick={() => setResolvingDecision(null)}
                  className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-[#0a0f16] text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving Outcome...' : 'Save & Replay Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
