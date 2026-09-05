import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
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
import { Navigation } from './Navigation';
import { MemoryView } from './MemoryView';
import { AskPastSelfView } from './AskPastSelfView';
import { DecisionReplayView } from './DecisionReplayView';
import { ThoughtEvolutionView } from './ThoughtEvolutionView';
import { EchoInsightsView } from './EchoInsightsView';
import {
  Brain,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Loader2,
  Calendar,
  Lightbulb,
  FileText,
  CheckCircle2,
  X,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // AI Reflection Actions State (Phase 2)
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

  // Phase 2: Execute AI Reflection Action
  const handleExecuteAction = async (actionType: ReflectionActionType) => {
    // Determine content to analyze: active messages or current input
    const messagesText = (activeInteraction?.messages || [])
      .map((m) => `${m.role === 'user' ? 'User' : 'ECHO'}: ${m.content}`)
      .join('\n\n');

    const contentToAnalyze = messagesText || inputPrompt.trim();
    if (!contentToAnalyze) {
      setReflectionError('Please write a reflection or continue a thought first to run an action.');
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

  const latestModelUsed =
    activeInteraction?.messages?.filter((m) => m.role === 'model' && m.modelUsed).slice(-1)[0]?.modelUsed ||
    (interactions.length > 0 ? 'gemini-3.8-flash' : null);

  return (
    <div id="echo-app-root" className="flex flex-col h-screen w-full bg-[#080a0f] text-[#e2e8f0] font-sans overflow-hidden">
      {/* Top Global Navigation Bar */}
      <Navigation
        currentView={currentView}
        onSelectView={(view) => {
          setCurrentView(view);
          setReflectionError(null);
        }}
        user={user}
        memoryCount={interactions.length}
      />

      {/* Main Viewport Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {currentView === 'memory' && (
          <div className="flex-1 overflow-y-auto">
            <MemoryView
              interactions={interactions}
              onSelectInteraction={(id) => {
                setActiveInteractionId(id);
                setCurrentView('reflect');
              }}
              onDeleteInteraction={handleDeleteInteraction}
              onNewReflection={handleCreateNewReflection}
            />
          </div>
        )}

        {currentView === 'ask_past_self' && (
          <div className="flex-1 overflow-y-auto">
            <AskPastSelfView
              user={user}
              interactions={interactions}
              onBackToReflect={() => setCurrentView('reflect')}
            />
          </div>
        )}

        {currentView === 'decisions' && (
          <div className="flex-1 overflow-y-auto">
            <DecisionReplayView user={user} />
          </div>
        )}

        {currentView === 'thought_evolution' && (
          <div className="flex-1 overflow-y-auto">
            <ThoughtEvolutionView user={user} interactions={interactions} />
          </div>
        )}

        {currentView === 'insights' && (
          <div className="flex-1 overflow-y-auto">
            <EchoInsightsView user={user} interactions={interactions} />
          </div>
        )}

        {/* Phase 1 & 2: Primary Reflect Workspace */}
        {currentView === 'reflect' && (
          <div className="flex-1 flex h-full overflow-hidden">
            {/* Left Reflection History Sidebar */}
            <aside
              className={`transition-all duration-200 bg-[#0c0e15] border-r border-[#1a1f2c] flex flex-col shrink-0 ${
                sidebarOpen ? 'w-64 sm:w-72' : 'w-0 overflow-hidden border-none'
              }`}
            >
              <div className="p-4 border-b border-[#1a1f2c] space-y-3">
                <button
                  id="workspace-new-reflection-btn"
                  onClick={handleCreateNewReflection}
                  className="w-full py-2 px-3 bg-teal-500 hover:bg-teal-400 text-[#080d14] text-xs font-semibold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Reflection</span>
                </button>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
                  <span>Recent Reflections</span>
                  <span className="text-[10px] font-mono text-slate-500">{interactions.length}</span>
                </div>
              </div>

              {/* Sidebar List */}
              <nav className="flex-1 overflow-y-auto p-2 space-y-1">
                {interactions.length === 0 && !dbLoading ? (
                  <div className="p-4 text-center text-xs text-slate-500 italic">
                    No reflections yet. Write your thoughts to start.
                  </div>
                ) : (
                  interactions.map((interaction) => {
                    const isSelected = interaction.id === activeInteractionId;
                    const dateStr = new Date(interaction.updatedAt || interaction.createdAt).toLocaleDateString(
                      undefined,
                      { month: 'short', day: 'numeric' }
                    );

                    return (
                      <div
                        key={interaction.id}
                        id={`sidebar-interaction-${interaction.id}`}
                        onClick={() => {
                          setActiveInteractionId(interaction.id);
                          setReflectionError(null);
                          setActionResult(null);
                        }}
                        className={`group relative w-full p-2.5 rounded-lg text-xs cursor-pointer transition-colors flex flex-col gap-0.5 border ${
                          isSelected
                            ? 'bg-[#151925] border-teal-500/40 text-white'
                            : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#121520]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate font-medium pr-1">
                            {interaction.title || 'Untitled Reflection'}
                          </span>
                          <button
                            title="Delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsDeletingId(interaction.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-rose-400 rounded transition cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                          <span>{dateStr}</span>
                          <span>&bull;</span>
                          <span>{interaction.messages?.length || 0} turns</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </nav>
            </aside>

            {/* Main Reflect Conversation Body */}
            <main className="flex-1 flex flex-col relative bg-[#080a0f] overflow-hidden">
              {/* Workspace Header */}
              <header className="h-14 border-b border-[#181c28] flex items-center justify-between px-4 sm:px-6 bg-[#090c13]/70 backdrop-blur-sm sticky top-0 z-10 shrink-0">
                <div className="flex items-center gap-2.5 overflow-hidden pr-4">
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    title={sidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#151824] border border-transparent hover:border-[#212638] cursor-pointer"
                  >
                    {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
                  </button>
                  <div className="flex flex-col truncate">
                    <h2 className="text-xs font-semibold text-white truncate">
                      {activeInteraction?.title || 'New Reflection Session'}
                    </h2>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {activeInteraction
                        ? `Updated ${new Date(activeInteraction.updatedAt || activeInteraction.createdAt).toLocaleDateString()} &bull; ${
                            activeInteraction.messages?.length || 0
                          } turns`
                        : 'Unsaved draft'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {latestModelUsed && (
                    <span className="text-[10px] px-2 py-0.5 rounded border border-[#212638] text-slate-400 font-mono bg-[#0e111a]">
                      {latestModelUsed}
                    </span>
                  )}
                  {activeInteraction && (
                    <button
                      onClick={() => setIsDeletingId(activeInteraction.id)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded transition cursor-pointer"
                      title="Delete reflection"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </header>

              {/* Messages Stream */}
              <div id="messages-container" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col space-y-6">
                {(!activeInteraction || !activeInteraction.messages || activeInteraction.messages.length === 0) &&
                !isReflecting ? (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto p-6 space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                      <Brain className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white mb-1">
                        What is occupying your mind today?
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Journal your unfiltered thoughts, dilemmas, or decisions. ECHO reflects back with cognitive inquiry, connects with your past entries, and preserves continuity.
                      </p>
                    </div>

                    {/* Quick prompts */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full text-left pt-2">
                      <button
                        onClick={() =>
                          setInputPrompt(
                            "I've been feeling scattered with competing priorities and struggling to choose where to focus."
                          )
                        }
                        className="p-3 rounded-lg border border-[#1d2334] bg-[#0d1017] hover:bg-[#141824] hover:border-teal-500/30 text-slate-300 text-xs transition cursor-pointer"
                      >
                        &ldquo;Feeling scattered with priorities...&rdquo;
                      </button>
                      <button
                        onClick={() =>
                          setInputPrompt(
                            "Reflecting on a key decision I made recently and wondering if my initial assumptions hold."
                          )
                        }
                        className="p-3 rounded-lg border border-[#1d2334] bg-[#0d1017] hover:bg-[#141824] hover:border-teal-500/30 text-slate-300 text-xs transition cursor-pointer"
                      >
                        &ldquo;Evaluating recent assumptions...&rdquo;
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {activeInteraction?.messages.map((message) => {
                      const isUser = message.role === 'user';
                      return isUser ? (
                        <div key={message.id} className="flex flex-col items-end">
                          <div className="max-w-[85%] sm:max-w-[80%] bg-[#181d2a] p-4 rounded-2xl rounded-tr-xs border border-[#262c3f] text-xs sm:text-sm leading-relaxed text-slate-100 whitespace-pre-wrap shadow-sm">
                            {message.content}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono mt-1 mr-1">
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ) : (
                        <div key={message.id} className="flex flex-col items-start">
                          <div className="max-w-[85%] sm:max-w-[80%] bg-[#0e121a] p-4 rounded-2xl rounded-tl-xs border border-teal-500/20 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-4 h-4 rounded bg-teal-500/20 text-teal-400 flex items-center justify-center text-[8px] font-bold">
                                E
                              </div>
                              <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">
                                ECHO Cognitive Reflection
                              </span>
                              {message.modelUsed && (
                                <span className="ml-auto text-[9px] font-mono px-1.5 py-0.2 rounded border border-[#1e2536] text-slate-500">
                                  {message.modelUsed}
                                </span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
                              {message.content}
                            </p>
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono mt-1 ml-1">
                            {new Date(message.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      );
                    })}

                    {/* Reflecting Pulse State */}
                    {isReflecting && (
                      <div className="flex items-center justify-center pt-2">
                        <div className="flex items-center gap-2 px-4 py-2 bg-[#0e121a] border border-teal-500/30 rounded-full">
                          <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                          <span className="text-xs text-teal-300">ECHO is reflecting with Gemini...</span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* AI Action Result Card (Phase 2) */}
                {actionResult && (
                  <div className="bg-[#0f1420] border border-teal-500/30 rounded-xl p-4 space-y-2 shadow-lg">
                    <div className="flex items-center justify-between border-b border-[#1b2338] pb-2">
                      <div className="flex items-center gap-2 text-teal-400 text-xs font-semibold uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Action: {actionResult.action.replace('_', ' ')}</span>
                        {actionResult.model && (
                          <span className="text-[9px] font-mono text-slate-500 lowercase bg-[#131a2a] px-1.5 py-0.5 rounded">
                            {actionResult.model}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={copyActionResult}
                          title="Copy to clipboard"
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#1a2336] transition-colors cursor-pointer"
                        >
                          {copiedAction ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setActionResult(null)}
                          title="Dismiss"
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-[#1a2336] transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-200 whitespace-pre-line">
                      {actionResult.result}
                    </p>
                  </div>
                )}

                {/* Error Banner */}
                {reflectionError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl text-rose-300 text-xs flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{reflectionError}</span>
                    </div>
                    {lastFailedPrompt && (
                      <button
                        onClick={() => handleSendPrompt(lastFailedPrompt)}
                        className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-900 border border-rose-800/80 text-rose-200 rounded text-xs font-medium flex items-center gap-1 transition shrink-0 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Retry</span>
                      </button>
                    )}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Bottom Input Area & AI Reflection Actions Toolbar */}
              <div className="p-4 sm:p-6 pt-2 bg-[#080a0f] border-t border-[#161a26] shrink-0 space-y-3">
                {/* Phase 2: Action Buttons Bar */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-slate-500 mr-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-teal-400" /> AI Actions:
                  </span>

                  {/* Key Insights */}
                  <button
                    onClick={() => handleExecuteAction('key_insights')}
                    disabled={Boolean(activeActionLoading) || isReflecting}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#111520] hover:bg-[#171c2b] border border-[#212739] text-slate-300 text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {activeActionLoading === 'key_insights' ? (
                      <Loader2 className="w-3 h-3 animate-spin text-teal-400" />
                    ) : (
                      <Lightbulb className="w-3 h-3 text-amber-400" />
                    )}
                    <span>Key Insights</span>
                  </button>

                  {/* Summarize */}
                  <button
                    onClick={() => handleExecuteAction('summarize')}
                    disabled={Boolean(activeActionLoading) || isReflecting}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#111520] hover:bg-[#171c2b] border border-[#212739] text-slate-300 text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {activeActionLoading === 'summarize' ? (
                      <Loader2 className="w-3 h-3 animate-spin text-teal-400" />
                    ) : (
                      <FileText className="w-3 h-3 text-indigo-400" />
                    )}
                    <span>Summarize</span>
                  </button>

                  {/* Next Steps */}
                  <button
                    onClick={() => handleExecuteAction('next_steps')}
                    disabled={Boolean(activeActionLoading) || isReflecting}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#111520] hover:bg-[#171c2b] border border-[#212739] text-slate-300 text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {activeActionLoading === 'next_steps' ? (
                      <Loader2 className="w-3 h-3 animate-spin text-teal-400" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3 text-teal-400" />
                    )}
                    <span>Next Steps</span>
                  </button>

                  {/* Brainstorm */}
                  <button
                    onClick={() => handleExecuteAction('brainstorm')}
                    disabled={Boolean(activeActionLoading) || isReflecting}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#111520] hover:bg-[#171c2b] border border-[#212739] text-slate-300 text-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {activeActionLoading === 'brainstorm' ? (
                      <Loader2 className="w-3 h-3 animate-spin text-teal-400" />
                    ) : (
                      <Brain className="w-3 h-3 text-purple-400" />
                    )}
                    <span>Brainstorm</span>
                  </button>
                </div>

                {/* Prompt Textarea */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendPrompt();
                  }}
                >
                  <div className="relative">
                    <textarea
                      id="journal-prompt-input"
                      rows={2}
                      value={inputPrompt}
                      onChange={(e) => setInputPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendPrompt();
                        }
                      }}
                      disabled={isReflecting}
                      placeholder="Write your thought, reflection, or question... (Press Enter to send)"
                      className="w-full bg-[#0d1017] border border-[#212739] rounded-xl p-3.5 pr-14 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/50 resize-none transition-colors"
                      maxLength={5000}
                    />
                    <button
                      id="send-prompt-btn"
                      type="submit"
                      disabled={isReflecting || !inputPrompt.trim()}
                      className="absolute right-3 bottom-3 w-8 h-8 rounded-lg bg-teal-500 hover:bg-teal-400 text-[#070b12] flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                      title="Send reflection"
                    >
                      {isReflecting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <div className="flex justify-between items-center mt-2 px-1 text-[10px] text-slate-500">
                    <span className="font-mono">Google Auth Verified &bull; Firestore Owner-Isolated</span>
                    <span className="font-mono">{inputPrompt.length} / 5000</span>
                  </div>
                </form>
              </div>
            </main>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {isDeletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-[#11141e] border border-[#222738] rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-white">Delete Reflection?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              This action will permanently delete this conversation from your private Cloud Firestore storage.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsDeletingId(null)}
                disabled={deletingLoading}
                className="px-3.5 py-2 rounded-lg border border-[#222738] bg-[#161a27] text-xs text-slate-300 hover:bg-[#1d2334] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-btn"
                onClick={() => handleDeleteInteraction(isDeletingId)}
                disabled={deletingLoading}
                className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
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
