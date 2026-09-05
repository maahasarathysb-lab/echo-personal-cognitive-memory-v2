import React from 'react';
import { User, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { NavView } from '../types';
import {
  Brain,
  BookOpen,
  Sparkles,
  GitFork,
  TrendingUp,
  Lightbulb,
  LogOut,
  Shield,
  Menu,
  X,
} from 'lucide-react';

interface NavigationProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  user: User;
  memoryCount: number;
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
    label: 'Reflect',
    icon: Brain,
    description: 'Workspace for thoughts & multi-turn dialogue',
  },
  {
    id: 'memory',
    label: 'Memory',
    icon: BookOpen,
    description: 'Browse personal reflection archive',
  },
  {
    id: 'ask_past_self',
    label: 'Ask Your Past Self',
    icon: Sparkles,
    badge: 'Flagship',
    description: 'Retrieve & synthesize past mindset',
  },
  {
    id: 'decisions',
    label: 'Decisions',
    icon: GitFork,
    description: 'Decision replay & outcome learning',
  },
  {
    id: 'thought_evolution',
    label: 'Thought Evolution',
    icon: TrendingUp,
    description: 'Chronological timeline & mindset shifts',
  },
  {
    id: 'insights',
    label: 'ECHO Insights',
    icon: Lightbulb,
    description: 'Grounded cognitive patterns & themes',
  },
];

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onSelectView,
  user,
  memoryCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const userInitial = user.displayName
    ? user.displayName.charAt(0).toUpperCase()
    : (user.email?.charAt(0).toUpperCase() || 'U');

  return (
    <header id="echo-app-header" className="bg-[#0b0d13] border-b border-[#1c202d] sticky top-0 z-30 shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-3">
            <button
              id="brand-home-btn"
              onClick={() => onSelectView('reflect')}
              className="flex items-center gap-2.5 group cursor-pointer focus:outline-none"
            >
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center group-hover:border-teal-400/50 transition-colors">
                <span className="text-teal-400 font-bold text-sm tracking-wide">E</span>
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium text-sm tracking-tight">ECHO</span>
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-teal-400/90 font-mono bg-teal-500/10 border border-teal-500/20 px-1.5 py-0.5 rounded">
                    <Shield className="w-2.5 h-2.5" /> Core v1
                  </span>
                </div>
                <span className="hidden md:inline text-[11px] text-slate-400 truncate max-w-[240px]">
                  Your Personal Cognitive Memory
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Primary Navigation Tabs */}
          <nav id="desktop-nav-tabs" className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => onSelectView(item.id)}
                  title={item.description}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#181c28] text-white shadow-sm border border-[#272d3f]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#131620]'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-1.5 py-0.2 rounded tracking-wide uppercase">
                      {item.badge}
                    </span>
                  )}
                  {item.id === 'memory' && memoryCount > 0 && (
                    <span className="text-[10px] font-mono bg-[#212738] text-slate-300 px-1.5 py-0.2 rounded">
                      {memoryCount}
                    </span>
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-teal-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Profile & Sign-out */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-[#1c202d]">
              <div
                title={user.email || 'Authenticated User'}
                className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-medium text-slate-200"
              >
                {userInitial}
              </div>
              <div className="hidden xl:flex flex-col text-left">
                <span className="text-xs text-slate-200 font-medium max-w-[120px] truncate">
                  {user.displayName || user.email?.split('@')[0] || 'User'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                  {user.email || 'Encrypted UID'}
                </span>
              </div>
            </div>

            <button
              id="signout-btn"
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors border border-transparent hover:border-rose-900/30 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>

            {/* Mobile menu button */}
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#141722] border border-[#202534] cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div id="mobile-nav-drawer" className="lg:hidden bg-[#0c0e16] border-b border-[#1c202d] px-4 py-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                id={`mobile-nav-${item.id}`}
                onClick={() => {
                  onSelectView(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#181c28] text-white border border-[#272d3f]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#131620]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 px-1.5 py-0.2 rounded tracking-wide uppercase">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
