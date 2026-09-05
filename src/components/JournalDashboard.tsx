import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  onSnapshot,
  query,
} from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../lib/firebase';
import {
  Interaction,
  Message,
  GeminiReflectResponse,
  NavView,
  ReflectionActionType,
  ActionResponse,
} from '../types';
import { Navigation, TopBar } from './Navigation';
import { CognitiveAtmosphere } from './CognitiveAtmosphere';
import { MemoryView } from './MemoryView';
import { AskPastSelfView } from './AskPastSelfView';
import { DecisionReplayView } from './DecisionReplayView';
import { ThoughtEvolutionView } from './ThoughtEvolutionView';
import { EchoInsightsView } from './EchoInsightsView';
import {
  Sparkles,
  AlertCircle,
  RefreshCw,
  Loader2,
  Lightbulb,
  FileText,
  CheckCircle2,
  X,
  Copy,
  Check,
  ArrowUpRight,
  Trash2,
  Brain,
} from 'lucide-react';

interface JournalDashboardProps {
  user: User;
}

export const JournalDashboard: React.FC<JournalDashboardProps> = ({ user }) => {
  const [currentView, setCurrentView] = useState<NavView>('reflect');
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [activeInteractionId, setActiveInteractionId] = useState<string | null>(null);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isReflecting, setIsReflecting] = useState(false);
  const [reflectionError, setReflectionError] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [dbLoading, setDbLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // AI Reflection Actions State
  const [activeActionLoading, setActiveActionLoading] = useState<ReflectionActionType | null>(null);
  const [actionResult, setActionResult] = useState<ActionResponse | null>(null);
  const [copiedAction, setCopiedAction] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (currentView === 'reflect') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [interactions, activeInteractionId, isReflecting, currentView]);

  // Real-time listener for user's interactions strictly scoped to request.auth.uid == userId
  useEffect(() => {
    if (!user || !user.uid) return;

    setDbLoading(true);
    const userInteractionsRef = collection(db, 'users', user.uid, 'interactions');
    const q = query(userInteractionsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: Interaction[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Omit<Interaction, 'id'>;
          items.push({
            id: docSnap.id,
            ...data,
          });
        });

        // Client-side sort by updatedAt descending
        items.sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt).getTime();
          return timeB - timeA;
        });

        setInteractions(items);
        setDbLoading(false);

        // Auto-select latest if no active selection
        if (!activeInteractionId && items.length > 0) {
          setActiveInteractionId(items[0].id);
        }
      },
      (error) => {
        console.error('Firestore snapshot listener error:', error);
        setDbLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, user.uid]);

  const activeInteraction = interactions.find((i) => i.id === activeInteractionId) || null;

  const handleCreateNewReflection = () => {
    setCurrentView('reflect');
    const newId = `echo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    setActiveInteractionId(newId);
    setInputPrompt('');
    setReflectionError(null);
    setActionResult(null);
  };

  const handleDeleteInteraction = async (interactionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      setDeletingLoading(true);
      await deleteDoc(doc(db, 'users', user.uid, 'interactions', interactionId));
      if (activeInteractionId === interactionId) {
        const remaining = interactions.filter((i) => i.id !== interactionId);
        setActiveInteractionId(remaining.length > 0 ? remaining[0].id : null);
      }
      setIsDeletingId(null);
    } catch (err) {
      console.error('Failed to delete interaction:', err);
      setReflectionError('Could not delete interaction. Please try again.');
    } finally {
      setDeletingLoading(false);
    }
  };

  const handleDeleteAllInteractions = async () => {
    if (!user || !user.uid) return;
    try {
      setDeletingLoading(true);
      const userInteractionsRef = collection(db, 'users', user.uid, 'interactions');
      const snap = await getDocs(query(userInteractionsRef));
      const batch = writeBatch(db);
      snap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      setInteractions([]);
      setActiveInteractionId(null);
    } catch (err) {
      console.error('Failed to delete all interactions:', err);
      throw err;
    } finally {
      setDeletingLoading(false);
    }
  };

  const handleSendPrompt = async (retryContent?: string) => {
    const promptToSend = (retryContent !== undefined ? retryContent : inputPrompt).trim();
    if (!promptToSend || isReflecting) return;

    setIsReflecting(true);
    setReflectionError(null);
    setLastFailedPrompt(null);
    if (!retryContent) {
      setInputPrompt('');
    }

    const currentId = activeInteractionId || `echo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    if (!activeInteractionId) {
      setActiveInteractionId(currentId);
    }

    const now = new Date().toISOString();
    const userMessage: Message = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: promptToSend,
      timestamp: now,
    };

    const existingMessages = activeInteraction?.messages || [];
    const updatedMessagesWithUser = [...existingMessages, userMessage];
    const currentTitle =
      activeInteraction?.title || (promptToSend.slice(0, 42) + (promptToSend.length > 42 ? '...' : ''));

    try {
      const idToken = await user.getIdToken();

      const historyPayload = existingMessages.slice(-20).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const controller = new AbortController();
      const timeoutTimer = setTimeout(() => controller.abort(), 60000);

      const response = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          prompt: promptToSend,
          history: historyPayload,
        }),
        signal: controller.signal,
      }).finally(() => {
        clearTimeout(timeoutTimer);
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned error status ${response.status}`);
      }

      const data: GeminiReflectResponse = await response.json();

      const assistantMessage: Message = {
        id: `msg_m_${Date.now()}`,
        role: 'model',
        content: data.text,
        timestamp: new Date().toISOString(),
        modelUsed: data.model,
      };

      const finalMessages = [...updatedMessagesWithUser, assistantMessage];

      const interactionRecord: Interaction = {
        id: currentId,
        title: currentTitle,
        createdAt: activeInteraction?.createdAt || now,
        updatedAt: new Date().toISOString(),
        messages: finalMessages,
      };

      const sanitizedRecord = sanitizeForFirestore(interactionRecord);
      await setDoc(doc(db, 'users', user.uid, 'interactions', currentId), sanitizedRecord);
    } catch (err: unknown) {
      console.error('Reflection request error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown communication error';
      setReflectionError(
        msg.includes('abort')
          ? 'Request timed out after 60 seconds. You can retry with the button below.'
          : msg || 'Unable to connect to reflection service.'
      );
      setLastFailedPrompt(promptToSend);
    } finally {
      setIsReflecting(false);
    }
  };

  // AI Reflection Action
  const handleExecuteAction = async (actionType: ReflectionActionType) => {
    const messagesText = (activeInteraction?.messages || [])
      .map((m) => `${m.role === 'user' ? 'Thought' : 'ECHO Reflection'}: ${m.content}`)
      .join('\n\n');

    const contentToAnalyze = messagesText || inputPrompt.trim();
    if (!contentToAnalyze) {
      setReflectionError('Write a thought or record a reflection first to run an action.');
      return;
    }

    try {
      setActiveActionLoading(actionType);
      setReflectionError(null);
      setActionResult(null);

      const idToken = await user.getIdToken();
      const res = await fetch('/api/gemini/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action: actionType,
          content: contentToAnalyze,
        }),
      });

      if (!res.ok) {
        throw new Error('Action failed to process');
      }

      const data: ActionResponse = await res.json();
      setActionResult(data);
    } catch (err) {
      console.error('Action error:', err);
      setReflectionError('Unable to generate cognitive action right now. Please retry.');
    } finally {
      setActiveActionLoading(null);
    }
  };

  const copyActionResult = () => {
    if (!actionResult) return;
    navigator.clipboard.writeText(actionResult.result);
    setCopiedAction(true);
    setTimeout(() => setCopiedAction(false), 2000);
  };

  const hasMessages = Boolean(activeInteraction && activeInteraction.messages && activeInteraction.messages.length > 0);

  return (
    <div id="echo-app-root" className="flex h-screen w-full bg-[#07090e] text-[#e2e8f0] font-sans overflow-hidden">
      {/* 1. LEFT ZONE: Compact Navigation Rail */}
      <Navigation
        currentView={currentView}
        onSelectView={(view) => {
          setCurrentView(view);
          setReflectionError(null);
        }}
        user={user}
        memoryCount={interactions.length}
        recentInteractions={interactions}
        activeInteractionId={activeInteractionId}
        onSelectInteraction={(id) => setActiveInteractionId(id)}
        onNewReflection={handleCreateNewReflection}
        onDeleteInteraction={(id) => setIsDeletingId(id)}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* 2. CENTER & RIGHT ZONES: Main Cognitive Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* Subtle Living Background Field */}
        <CognitiveAtmosphere />

        {/* Minimal Premium Top Bar */}
        <TopBar
          currentView={currentView}
          user={user}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          interactionsCount={interactions.length}
          onDeleteAllReflections={handleDeleteAllInteractions}
        />

        {/* Viewport Swapping */}
        <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
          {/* MEMORY VIEW */}
          {currentView === 'memory' && (
            <MemoryView
              interactions={interactions}
              onSelectInteraction={(id) => {
                setActiveInteractionId(id);
                setCurrentView('reflect');
              }}
              onDeleteInteraction={handleDeleteInteraction}
              onNewReflection={handleCreateNewReflection}
            />
          )}

          {/* ASK YOUR PAST SELF VIEW */}
          {currentView === 'ask_past_self' && (
            <AskPastSelfView
              user={user}
              interactions={interactions}
              onBackToReflect={() => setCurrentView('reflect')}
            />
          )}

          {/* DECISIONS VIEW */}
          {currentView === 'decisions' && (
            <DecisionReplayView user={user} />
          )}

          {/* THOUGHT EVOLUTION VIEW */}
          {currentView === 'thought_evolution' && (
            <ThoughtEvolutionView user={user} interactions={interactions} />
          )}

          {/* ECHO INSIGHTS VIEW */}
          {currentView === 'insights' && (
            <EchoInsightsView user={user} interactions={interactions} />
          )}

          {/* REFLECT SCREEN — REDESIGNED PERSONAL THOUGHT SPACE */}
          {currentView === 'reflect' && (
            <main className="max-w-4xl mx-auto px-4 sm:px-8 lg:px-10 py-7 sm:py-10 flex flex-col space-y-7">
              {/* Header Section with Strong Hierarchy */}
              <header className="space-y-2 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono tracking-[0.25em] text-teal-400 uppercase font-medium">
                    REFLECT
                  </span>
                  {activeInteraction && (
                    <button
                      onClick={() => setIsDeletingId(activeInteraction.id)}
                      className="text-neutral-500 hover:text-neutral-300 opacity-60 hover:opacity-100 transition-opacity p-1 rounded cursor-pointer text-xs flex items-center gap-1.5"
                      title="Delete this reflection session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-mono">Delete session</span>
                    </button>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-normal tracking-tight text-neutral-100">
                  Give your thoughts somewhere to go.
                </h1>

                <p className="text-sm text-neutral-400 leading-relaxed max-w-2xl font-normal">
                  Write freely. ECHO helps you understand what you&apos;re thinking, without losing where the thought came from.
                </p>
              </header>

              {/* Central Reflection Composer (Primary Thought Studio Surface) */}
              <section className="bg-[#0b0e15]/95 border border-white/[0.08] focus-within:border-teal-500/40 rounded-2xl p-5 sm:p-7 shadow-[0_15px_35px_rgba(0,0,0,0.5)] focus-within:shadow-[0_0_30px_rgba(45,212,191,0.06)] backdrop-blur-md transition-all duration-200">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendPrompt();
                  }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <label htmlFor="reflection-writing-surface" className="text-[11px] font-mono tracking-[0.16em] text-neutral-400 uppercase font-medium block">
                      What is on your mind?
                    </label>
                    <textarea
                      id="reflection-writing-surface"
                      rows={5}
                      value={inputPrompt}
                      onChange={(e) => setInputPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          handleSendPrompt();
                        }
                      }}
                      disabled={isReflecting}
                      placeholder="Write a thought, question, decision, doubt, idea, or realization..."
                      className="w-full bg-transparent border-0 text-sm sm:text-base text-neutral-100 placeholder:text-neutral-500 focus:outline-none resize-none leading-relaxed"
                      maxLength={5000}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 border-t border-white/[0.05]">
                    <span className="text-[10.5px] font-mono text-neutral-500">
                      Press ⌘ + Enter to reflect · {inputPrompt.length} / 5000
                    </span>

                    <button
                      id="submit-thought-btn"
                      type="submit"
                      disabled={isReflecting || !inputPrompt.trim()}
                      className="h-10 px-4 bg-teal-500/15 hover:bg-teal-500/25 active:bg-teal-500/20 text-teal-300 hover:text-teal-200 border border-teal-500/30 rounded-xl text-xs font-mono tracking-wider flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
                      title="Reflect thought"
                    >
                      {isReflecting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
                          <span>Reflecting...</span>
                        </>
                      ) : (
                        <>
                          <span>Record & Reflect</span>
                          <ArrowUpRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </section>

              {/* Error Banner */}
              {reflectionError && (
                <div
                  className="p-4 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-300 text-xs flex items-center justify-between gap-3"
                  role="alert"
                >
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{reflectionError}</span>
                  </div>
                  {lastFailedPrompt && (
                    <button
                      onClick={() => handleSendPrompt(lastFailedPrompt)}
                      className="px-2.5 py-1 bg-rose-900/40 hover:bg-rose-900/70 border border-rose-800/70 text-rose-200 rounded-lg text-xs font-mono flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  )}
                </div>
              )}

              {/* Thought Stream & Reflect Dialogue */}
              {hasMessages ? (
                <div className="space-y-6 pt-1">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
                    <span className="text-[10px] font-mono tracking-[0.2em] text-neutral-400 uppercase font-medium">
                      THOUGHT TRAJECTORY
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500">
                      {activeInteraction?.messages.length} exchanges
                    </span>
                  </div>

                  {activeInteraction?.messages.map((message) => {
                    const isUser = message.role === 'user';
                    const timeStr = new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return isUser ? (
                      /* USER THOUGHT CARD — Editorial, subtle surface contrast, minimal borders */
                      <article
                        key={message.id}
                        className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 sm:p-6 space-y-2.5 shadow-sm text-left transition-colors"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500">
                          <span className="tracking-widest uppercase text-neutral-400 font-medium">
                            YOUR THOUGHT
                          </span>
                          <span>{timeStr}</span>
                        </div>
                        <p className="text-sm sm:text-base text-neutral-100 leading-relaxed font-normal whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </article>
                    ) : (
                      /* ECHO REFLECTION CARD — Core cognitive intelligence, spacious, calm depth */
                      <article
                        key={message.id}
                        className="bg-teal-950/15 border border-teal-500/20 rounded-2xl p-6 sm:p-7 space-y-3.5 shadow-md text-left relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono">
                          <div className="flex items-center gap-2 text-teal-300 font-medium tracking-widest uppercase">
                            {/* Harmonic wave resonance indicator */}
                            <div className="flex items-center gap-0.5" aria-hidden="true">
                              <span className="w-1 h-2 bg-teal-400 rounded-full" />
                              <span className="w-1 h-3.5 bg-teal-400 rounded-full" />
                              <span className="w-1 h-2 bg-teal-400 rounded-full" />
                            </div>
                            <span>ECHO REFLECTION</span>
                          </div>
                          <span className="text-neutral-500">{timeStr}</span>
                        </div>

                        <p className="text-sm sm:text-base text-neutral-200 leading-relaxed font-normal whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </article>
                    );
                  })}

                  {/* Ongoing Reflection Pulse */}
                  {isReflecting && (
                    <div className="flex items-center justify-center py-6">
                      <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-teal-950/40 border border-teal-500/30 text-teal-300 text-xs font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                        <span>ECHO is listening and synthesizing cognitive reflections...</span>
                      </div>
                    </div>
                  )}

                  {/* 5. AI ACTIONS: Compact ECHO ACTIONS Row */}
                  <section className="pt-5 border-t border-white/[0.06] space-y-3.5">
                    <div className="flex items-center gap-2 text-[10px] font-mono tracking-[0.2em] text-neutral-400 uppercase font-medium">
                      <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                      <span>ECHO ACTIONS</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Key Insights */}
                      <button
                        onClick={() => handleExecuteAction('key_insights')}
                        disabled={Boolean(activeActionLoading) || isReflecting}
                        className="p-3.5 rounded-xl bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.07] hover:border-teal-500/30 text-left transition-all duration-200 cursor-pointer disabled:opacity-40 group flex flex-col justify-between min-h-[82px]"
                      >
                        <div className="flex items-center justify-between pb-1 w-full">
                          <Lightbulb className="w-4 h-4 text-amber-400/90 group-hover:scale-105 transition-transform" />
                          {activeActionLoading === 'key_insights' && (
                            <Loader2 className="w-3 h-3 animate-spin text-teal-400" />
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-medium text-neutral-200 block">Key Insights</span>
                          <span className="text-[10.5px] text-neutral-400 font-mono block">Core patterns</span>
                        </div>
                      </button>

                      {/* Summarize */}
                      <button
                        onClick={() => handleExecuteAction('summarize')}
                        disabled={Boolean(activeActionLoading) || isReflecting}
                        className="p-3.5 rounded-xl bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.07] hover:border-teal-500/30 text-left transition-all duration-200 cursor-pointer disabled:opacity-40 group flex flex-col justify-between min-h-[82px]"
                      >
                        <div className="flex items-center justify-between pb-1 w-full">
                          <FileText className="w-4 h-4 text-cyan-400/90 group-hover:scale-105 transition-transform" />
                          {activeActionLoading === 'summarize' && (
                            <Loader2 className="w-3 h-3 animate-spin text-teal-400" />
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-medium text-neutral-200 block">Summarize</span>
                          <span className="text-[10.5px] text-neutral-400 font-mono block">Distill thought</span>
                        </div>
                      </button>

                      {/* Next Steps */}
                      <button
                        onClick={() => handleExecuteAction('next_steps')}
                        disabled={Boolean(activeActionLoading) || isReflecting}
                        className="p-3.5 rounded-xl bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.07] hover:border-teal-500/30 text-left transition-all duration-200 cursor-pointer disabled:opacity-40 group flex flex-col justify-between min-h-[82px]"
                      >
                        <div className="flex items-center justify-between pb-1 w-full">
                          <CheckCircle2 className="w-4 h-4 text-teal-400/90 group-hover:scale-105 transition-transform" />
                          {activeActionLoading === 'next_steps' && (
                            <Loader2 className="w-3 h-3 animate-spin text-teal-400" />
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-medium text-neutral-200 block">Next Steps</span>
                          <span className="text-[10.5px] text-neutral-400 font-mono block">Actionable clarity</span>
                        </div>
                      </button>

                      {/* Brainstorm */}
                      <button
                        onClick={() => handleExecuteAction('brainstorm')}
                        disabled={Boolean(activeActionLoading) || isReflecting}
                        className="p-3.5 rounded-xl bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.07] hover:border-teal-500/30 text-left transition-all duration-200 cursor-pointer disabled:opacity-40 group flex flex-col justify-between min-h-[82px]"
                      >
                        <div className="flex items-center justify-between pb-1 w-full">
                          <Brain className="w-4 h-4 text-purple-400/90 group-hover:scale-105 transition-transform" />
                          {activeActionLoading === 'brainstorm' && (
                            <Loader2 className="w-3 h-3 animate-spin text-teal-400" />
                          )}
                        </div>
                        <div>
                          <span className="text-xs font-medium text-neutral-200 block">Brainstorm</span>
                          <span className="text-[10.5px] text-neutral-400 font-mono block">New angles</span>
                        </div>
                      </button>
                    </div>

                    {/* Action Result Card */}
                    {actionResult && (
                      <div className="mt-4 p-5 rounded-2xl bg-[#0e121b] border border-teal-500/30 space-y-3 shadow-lg text-left">
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                          <div className="flex items-center gap-2 text-teal-300 text-xs font-mono uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                            <span>Action: {actionResult.action.replace('_', ' ')}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={copyActionResult}
                              className="p-1 text-neutral-400 hover:text-white rounded hover:bg-white/[0.05] transition cursor-pointer"
                              title="Copy to clipboard"
                            >
                              {copiedAction ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => setActionResult(null)}
                              className="p-1 text-neutral-400 hover:text-white rounded hover:bg-white/[0.05] transition cursor-pointer"
                              title="Dismiss"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-line font-normal">
                          {actionResult.result}
                        </p>
                      </div>
                    )}
                  </section>
                </div>
              ) : (
                /* Empty state with intentional visual anchors */
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                    <Brain className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-medium text-neutral-200">
                      Your cognitive timeline starts with the first thought you save.
                    </h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Journal unfiltered observations, doubts, decisions, or curiosities above. ECHO stores and connects them over time.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-3 text-left">
                    <button
                      onClick={() => setInputPrompt("I have been reflecting on my recent career priorities and where I should direct my focus next.")}
                      className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] text-neutral-300 text-xs transition cursor-pointer"
                    >
                      &ldquo;Reflecting on career priorities...&rdquo;
                    </button>
                    <button
                      onClick={() => setInputPrompt("I noticed a hesitation in making a key decision this week and want to understand my underlying assumptions.")}
                      className="p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] text-neutral-300 text-xs transition cursor-pointer"
                    >
                      &ldquo;Understanding decision assumptions...&rdquo;
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </main>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0e111a] border border-white/[0.09] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-left">
            <h3 className="text-sm font-semibold text-neutral-100">Delete Reflection Session?</h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              This reflection and its recorded thoughts will be permanently deleted from your private archive.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setIsDeletingId(null)}
                disabled={deletingLoading}
                className="px-3.5 py-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-xs text-neutral-300 hover:bg-white/[0.07] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-btn"
                onClick={() => handleDeleteInteraction(isDeletingId)}
                disabled={deletingLoading}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
              >
                {deletingLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
