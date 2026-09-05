import React, { useState } from 'react';
import { User, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { NavView, Interaction } from '../types';
import { EchoLogo } from './EchoLogo';
import { ProfileDropdown } from './ProfileDropdown';
import {
  Brain,
  BookOpen,
  Sparkles,
  GitFork,
  TrendingUp,
  Lightbulb,
  LogOut,
  Plus,
  Trash2,
  Menu,
  X,
} from 'lucide-react';

interface NavigationProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  user: User;
  memoryCount: number;
  recentInteractions?: Interaction[];
  activeInteractionId?: string | null;
  onSelectInteraction?: (id: string) => void;
  onNewReflection?: () => void;
  onDeleteInteraction?: (id: string, e?: React.MouseEvent) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

interface NavItem {
  id: NavView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'reflect',
    label: 'REFLECT',
    icon: Brain,
    description: 'Personal thought space & cognitive dialogue',
  },
  {
    id: 'memory',
    label: 'MEMORY',
    icon: BookOpen,
    description: 'Connected personal reflection archive',
  },
  {
    id: 'ask_past_self',
    label: 'ASK YOUR PAST SELF',
    icon: Sparkles,
    badge: 'Flagship',
    description: 'Grounded recall of past mindsets',
  },
  {
    id: 'decisions',
    label: 'DECISIONS',
    icon: GitFork,
    description: 'Personal decision journal & outcomes',
  },
  {
    id: 'thought_evolution',
    label: 'THOUGHT EVOLUTION',
    icon: TrendingUp,
    description: 'Longitudinal cognitive trajectory',
  },
  {
    id: 'insights',
    label: 'ECHO INSIGHTS',
    icon: Lightbulb,
    description: 'Grounded patterns & themes over time',
  },
];

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onSelectView,
  user,
  memoryCount,
  recentInteractions = [],
  activeInteractionId,
  onSelectInteraction,
  onNewReflection,
  onDeleteInteraction,
  mobileMenuOpen,
  setMobileMenuOpen,
}) => {
  const [hoveredDeleteId, setHoveredDeleteId] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const navContent = (
    <div className="flex flex-col h-full select-none">
      {/* 1. Top Brand Identity */}
      <div className="p-4 sm:p-5 pb-3.5 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <EchoLogo size={34} glow={true} />
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold tracking-[0.26em] text-neutral-100 uppercase font-sans leading-none">
              ECHO
            </span>
            <span className="text-[8.5px] uppercase tracking-[0.2em] text-teal-400/90 font-mono font-medium mt-1">
              YOUR PERSONAL COGNITIVE MEMORY
            </span>
          </div>
        </div>

        {/* Action: New Reflection Button */}
        {onNewReflection && (
          <button
            id="nav-new-reflection-btn"
            onClick={() => {
              onNewReflection();
              setMobileMenuOpen(false);
            }}
            className="mt-3.5 w-full h-8.5 px-3 bg-white/[0.03] hover:bg-teal-500/15 text-neutral-200 hover:text-teal-300 border border-white/[0.07] hover:border-teal-500/30 rounded-xl text-xs font-medium tracking-wide flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-sm group"
          >
            <Plus className="w-3.5 h-3.5 text-teal-400 group-hover:scale-110 transition-transform" />
            <span>New Reflection</span>
          </button>
        )}
      </div>

      {/* 2. Primary Navigation Section */}
      <nav className="p-2.5 sm:p-3 space-y-1">
        <p className="px-2.5 pt-0.5 pb-1 text-[9px] font-mono tracking-[0.25em] text-neutral-500 uppercase font-medium">
          Navigation
        </p>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => {
                onSelectView(item.id);
                setMobileMenuOpen(false);
              }}
              title={item.description}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer group ${
                isActive
                  ? 'bg-teal-500/10 text-teal-200 border border-teal-500/25 shadow-[0_0_12px_rgba(20,184,166,0.08)]'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-teal-400' : 'text-neutral-500 group-hover:text-neutral-300'
                  }`}
                />
                <span className="tracking-[0.12em] text-[11px] font-mono truncate">{item.label}</span>
              </div>

              {item.id === 'memory' && memoryCount > 0 ? (
                <span className="text-[10px] font-mono text-neutral-400 bg-white/[0.05] px-1.5 py-0.5 rounded shrink-0">
                  {memoryCount}
                </span>
              ) : item.badge ? (
                <span className="text-[8.5px] font-mono uppercase tracking-widest text-teal-300/90 bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded shrink-0">
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* 3. Secondary Section: RECENT REFLECTIONS (Controlled 6-8 max, with VIEW ALL) */}
      <div className="flex-1 flex flex-col min-h-0 border-t border-white/[0.05] pt-3 px-2.5 sm:px-3">
        <div className="flex items-center justify-between px-2.5 pb-1.5">
          <span className="text-[9px] font-mono tracking-[0.25em] text-neutral-500 uppercase font-medium">
            Recent Reflections
          </span>
          <span className="text-[9px] font-mono text-neutral-500">
            {recentInteractions.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar">
          {recentInteractions.length === 0 ? (
            <div className="px-2.5 py-4 text-center text-[11px] text-neutral-500 italic">
              No recent reflections
            </div>
          ) : (
            <>
              {recentInteractions.slice(0, 7).map((interaction) => {
                const isSelected = interaction.id === activeInteractionId && currentView === 'reflect';
                const dateStr = new Date(interaction.updatedAt || interaction.createdAt).toLocaleDateString(
                  undefined,
                  { month: 'short', day: 'numeric' }
                );
                const exchangeCount = interaction.messages?.length || 0;

                return (
                  <div
                    key={interaction.id}
                    id={`recent-item-${interaction.id}`}
                    onClick={() => {
                      if (onSelectInteraction) onSelectInteraction(interaction.id);
                      onSelectView('reflect');
                      setMobileMenuOpen(false);
                    }}
                    onMouseEnter={() => setHoveredDeleteId(interaction.id)}
                    onMouseLeave={() => setHoveredDeleteId(null)}
                    className={`group relative w-full px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all duration-150 flex flex-col gap-0.5 border ${
                      isSelected
                        ? 'bg-teal-500/10 border-teal-500/30 text-neutral-100'
                        : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-[11px] font-normal leading-tight pr-1">
                        {interaction.title || 'Untitled Thought'}
                      </span>
                      {onDeleteInteraction && hoveredDeleteId === interaction.id && (
                        <button
                          title="Delete reflection"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteInteraction(interaction.id, e);
                          }}
                          className="p-0.5 text-neutral-500 hover:text-rose-400 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] text-neutral-500 font-mono">
                      <span>{dateStr}</span>
                      <span>·</span>
                      <span>{exchangeCount} {exchangeCount === 1 ? 'exchange' : 'exchanges'}</span>
                    </div>
                  </div>
                );
              })}

              {/* View All Action */}
              {recentInteractions.length > 0 && (
                <button
                  id="nav-view-all-reflections-btn"
                  onClick={() => {
                    onSelectView('memory');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full mt-1.5 py-1.5 px-2 text-center text-[10px] font-mono tracking-wider text-neutral-400 hover:text-teal-300 hover:bg-white/[0.02] rounded-lg transition-colors cursor-pointer border border-transparent hover:border-white/[0.06] flex items-center justify-center gap-1.5"
                >
                  <span>VIEW ALL MEMORIES</span>
                  <span className="text-[9px] text-teal-400/80">({recentInteractions.length})</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 4. Bottom Rail Anchor: Privacy & Sign Out */}
      <div className="p-3 border-t border-white/[0.05] bg-[#090b10]">
        <div className="flex items-center justify-between px-2 py-1 text-[10px] font-mono text-neutral-400">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(45,212,191,0.7)]" />
            <span className="tracking-wider">PRIVATE MEMORY</span>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out of ECHO"
            className="text-neutral-500 hover:text-neutral-300 transition-colors p-1 rounded cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Navigation Rail (Left Zone) */}
      <aside
        id="desktop-nav-rail"
        className="hidden md:flex w-60 lg:w-64 h-screen flex-col shrink-0 bg-[#090b11] border-r border-white/[0.06] z-20"
      >
        {navContent}
      </aside>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-72 max-w-[85vw] h-full bg-[#090b11] border-r border-white/[0.08] shadow-2xl flex flex-col">
            <div className="flex items-center justify-end p-3 border-b border-white/[0.05]">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">{navContent}</div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}
    </>
  );
};

interface TopBarProps {
  currentView: NavView;
  user: User;
  onOpenMobileMenu: () => void;
  interactionsCount?: number;
  onDeleteAllReflections?: () => Promise<void>;
}

const VIEW_TITLES: Record<NavView, { title: string; subtitle: string }> = {
  reflect: {
    title: 'Reflect',
    subtitle: 'Give your thoughts somewhere to go',
  },
  memory: {
    title: 'Memory Archive',
    subtitle: 'Connected personal reflection archive',
  },
  ask_past_self: {
    title: 'Ask Your Past Self',
    subtitle: 'Somewhere in your past, you already thought about this',
  },
  decisions: {
    title: 'Decisions',
    subtitle: 'See what you chose, why you chose it, and what happened next',
  },
  thought_evolution: {
    title: 'Thought Evolution',
    subtitle: 'Watch your thinking change over time',
  },
  insights: {
    title: 'ECHO Insights',
    subtitle: 'Patterns emerge when you give your thoughts enough time',
  },
};

export const TopBar: React.FC<TopBarProps> = ({
  currentView,
  user,
  onOpenMobileMenu,
  interactionsCount = 0,
  onDeleteAllReflections,
}) => {
  const current = VIEW_TITLES[currentView] || { title: 'ECHO', subtitle: 'Personal Cognitive Memory' };

  return (
    <header
      id="echo-top-bar"
      className="h-14 md:h-16 border-b border-white/[0.06] bg-[#07090e]/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 z-20 select-none relative"
    >
      {/* Left: Mobile Menu Toggle + Section Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="p-1.5 md:hidden rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.04] cursor-pointer"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-sm md:text-base font-medium tracking-tight text-neutral-100 flex items-center gap-2">
            <span>{current.title}</span>
          </h1>
          <span className="hidden sm:inline text-[11px] text-neutral-500 font-normal truncate max-w-md">
            {current.subtitle}
          </span>
        </div>
      </div>

      {/* Center/Right: Privacy Status & User Profile Dropdown */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Privacy Status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.02] border border-white/[0.05] text-[10px] font-mono text-neutral-400">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]" />
          <span className="tracking-widest">PRIVATE MEMORY</span>
        </div>

        {/* User Account Profile Dropdown (Only avatar in top-right) */}
        <div className="pl-2 border-l border-white/[0.06]">
          <ProfileDropdown
            user={user}
            interactionsCount={interactionsCount}
            onDeleteAllReflections={onDeleteAllReflections}
          />
        </div>
      </div>
    </header>
  );
};
